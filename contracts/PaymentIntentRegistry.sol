// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @title QIE SafeRoute Payment Intent Registry
/// @notice Optional, non-custodial anchoring and revocation for signed payment intents.
/// @dev Stores only a digest and expiry. Raw intent data, signatures, and funds never enter the contract.
contract PaymentIntentRegistry {
    uint64 public constant MAX_LIFETIME = 7 days;

    struct IntentAnchor {
        uint64 expiresAt;
        bool revoked;
    }

    mapping(address signer => mapping(bytes32 intentHash => IntentAnchor)) public anchors;

    event IntentAnchored(address indexed signer, bytes32 indexed intentHash, uint64 expiresAt);
    event IntentRevoked(address indexed signer, bytes32 indexed intentHash);

    error InvalidIntentHash();
    error InvalidExpiry();
    error MissingAnchor();
    error AlreadyRevoked();

    /// @notice Anchors a digest, or refreshes the expiry of an existing live anchor.
    /// @dev Revocation is final for a given digest: a signer cannot re-activate a revoked
    ///      anchor by calling `anchor` again. Verifiers may therefore treat `revoked` as a
    ///      monotonic signal. To restart the flow the signer issues a new intent with a new nonce.
    function anchor(bytes32 intentHash, uint64 expiresAt) external {
        if (intentHash == bytes32(0)) revert InvalidIntentHash();
        if (expiresAt <= block.timestamp || expiresAt > block.timestamp + MAX_LIFETIME) {
            revert InvalidExpiry();
        }
        IntentAnchor storage intent = anchors[msg.sender][intentHash];
        if (intent.revoked) revert AlreadyRevoked();
        intent.expiresAt = expiresAt;
        emit IntentAnchored(msg.sender, intentHash, expiresAt);
    }

    function revoke(bytes32 intentHash) external {
        IntentAnchor storage intent = anchors[msg.sender][intentHash];
        if (intent.expiresAt == 0) revert MissingAnchor();
        if (intent.revoked) revert AlreadyRevoked();
        intent.revoked = true;
        emit IntentRevoked(msg.sender, intentHash);
    }

    function isActive(address signer, bytes32 intentHash) external view returns (bool) {
        IntentAnchor memory intent = anchors[signer][intentHash];
        return intent.expiresAt > block.timestamp && !intent.revoked;
    }
}
