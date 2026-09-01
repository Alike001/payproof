# PayProof Visual Fidelity Ledger

## Reference generation

The two concept boards were generated with the built-in image-generation tool
before application code was written. The working prompt asked for a premium,
true-white fintech product with near-navy typography, restrained cobalt accents,
a clear testnet notice, an invoice-to-verified-receipt story, and responsive
desktop/mobile product surfaces. It explicitly prioritized product clarity,
legible financial hierarchy, and code-reproducible UI over decorative imagery.

- Reference size: `1435 × 1096` pixels each
- Landing reference: `payproof-landing-concept.png`
- Product-flow reference: `payproof-product-flow-concept.png`

Both references were inspected at original resolution before implementation.

## Implementation captures

The application was captured through the Playwright browser at:

- Desktop: `1435 × 1096` viewport, full-page PNG
- Mobile: `390 × 844` viewport, full-page PNG

Both captures were inspected at original resolution after the production build
passed.

## Comparison

| Visual axis | Reference intention | Implemented result | Status |
| --- | --- | --- | --- |
| Palette | True white, near navy, vivid cobalt, pale blue, restrained green | Same core palette is encoded as CSS variables | Matched |
| Hierarchy | Product promise left, tangible invoice/receipt proof right | Two-column desktop hero and stacked mobile hero preserve that reading order | Matched |
| Financial object | A crisp invoice document carries the visual story | Code-native invoice card includes local amount, test USDC, and exact verification checks | Matched |
| Trust signal | Testnet and verification state must be unmistakable | Persistent top notice plus green verified state and evidence checklist | Matched |
| Density | Spacious desktop layout with compact, legible document details | 1180px desktop frame and condensed mobile card remain readable without horizontal scroll | Matched |
| Typography | Modern grotesk with strong display copy and quiet supporting text | System sans stack achieves the shape without a runtime font dependency | Close match |
| Motion | Subtle entrance only | Short rise-in animation with reduced-motion protection | Matched |

## Copy differences

Concept-board sample copy was replaced where necessary with the accepted PayProof
product language. The implementation says `test USDC`, `Base Sepolia testnet`,
and `EXAMPLE` explicitly. It avoids concept text that could imply a live payment,
real value, cryptographic storage, or a currency conversion performed by
PayProof.

## Deliberate deviations

- The implementation uses a code-native brand mark instead of treating a
  generated raster logo as a production asset.
- The desktop hero uses more breathing room and a larger invoice than the board
  so the 30-second story remains readable at common laptop widths.
- The implementation adds a full three-step explanation and non-custody trust
  strip below the hero because those ideas are required by the accepted PRD.
- Dev-only screenshots show the Next.js development-tools bubble; it will not
  appear in the production build and is not part of the design.

## Current assessment

The first shell is high-fidelity to the concept direction: composition, palette,
document motif, state colors, spacing, and product tone all carry through. The
next fidelity review occurs when real invoice, quote, payment, and receipt states
replace the example surface.
