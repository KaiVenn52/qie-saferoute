// SPDX-License-Identifier: MIT
pragma solidity ^0.8.24;

/// @notice Optional, non-custodial anchor for a signed SafeRoute proof.
/// @dev No funds, private data, or raw signatures are stored.
contract SafeRouteRegistry {
    struct RouteAnchor {
        bytes32 proofHash;
        uint64 expiresAt;
        bool revoked;
    }

    mapping(address => RouteAnchor) public anchors;

    event RouteAnchored(address indexed signer, bytes32 indexed proofHash, uint64 expiresAt);
    event RouteRevoked(address indexed signer, bytes32 indexed proofHash);

    error InvalidExpiry();
    error MissingAnchor();

    function anchor(bytes32 proofHash, uint64 expiresAt) external {
        if (proofHash == bytes32(0) || expiresAt <= block.timestamp) revert InvalidExpiry();
        anchors[msg.sender] = RouteAnchor(proofHash, expiresAt, false);
        emit RouteAnchored(msg.sender, proofHash, expiresAt);
    }

    function revoke() external {
        RouteAnchor storage route = anchors[msg.sender];
        if (route.proofHash == bytes32(0)) revert MissingAnchor();
        route.revoked = true;
        emit RouteRevoked(msg.sender, route.proofHash);
    }

    function isActive(address signer, bytes32 proofHash) external view returns (bool) {
        RouteAnchor memory route = anchors[signer];
        return route.proofHash == proofHash && !route.revoked && route.expiresAt > block.timestamp;
    }
}
