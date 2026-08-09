# QIE SafeRoute demo video

Target length: 60–90 seconds. Record at 16:9, 1080p if possible. Keep the cursor slow and readable. Do not show a seed phrase, private key, password, wallet recovery screen, or personal browser data.

## Recording sequence

1. **Opening (0–10s)** — Show the top of the live demo. Say: “QIE exposes one account in both 0x and qie1 formats. SafeRoute checks the route and proves recipient wallet control before funds move.”
2. **Resolve (10–25s)** — Leave the public genesis address in the input and click **Run safety check**. Point to the resolved EVM and QIE addresses. Say: “Paste either format; the corresponding representation is derived locally.”
3. **Control proof (25–50s)** — Click **Create signed proof** and sign the message with a QIE Testnet wallet. This is a message signature, not a transaction. If signing is unavailable, switch to **Verify proof**, paste the bundled demo proof, and click **Verify signature**. Say: “The verifier checks the address pair, signer, chain ID, nonce, lifetime, and expiry. JSON or QR proofs can be verified offline.”
4. **Boundary (50–70s)** — Scroll to **Integration API**. Say: “SafeRoute is a narrow developer primitive for wallet send screens, exchange deposits, and merchant checkout. It never takes custody and does not claim that address control proves identity, reputation, or transaction safety.”
5. **Close (70–80s)** — Return to the result. Say: “QIE SafeRoute. Verify the route. Then pay.” Hold on the live demo and repository URLs for three seconds.

## Upload

Upload to YouTube as **Unlisted** (not Private), Loom, Vimeo, or another URL that opens without signing in. Confirm the URL in a private/incognito window before using it in the submission form.
