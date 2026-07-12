// StateProvider adapter — derives live gauge sources from portfolio + hero
// state. Pure given the injected getters, so it's unit-testable without IO.
// See GAMreq §3.3 / §5. Zero-qty positions are excluded everywhere.

const heldQty = (p) => parseFloat(p?.total_qty ?? 0)
const isHeld = (p) => heldQty(p) > 0

export function createStateProvider({ getPositions, getCouncilSize }) {
  async function read(userId) {
    const positions = (await getPositions(userId)) ?? []
    const held = positions.filter(isHeld)
    const etfs = held.filter((p) => p.asset_type === 'ETF')
    const crypto = held.filter((p) => p.asset_type === 'CRYPTO')

    const distinct = (rows) => new Set(rows.map((p) => p.ticker)).size

    return {
      heldDistinct: distinct(held),
      etfHeld: etfs.length,
      etfDistinct: distinct(etfs),
      cryptoHeld: crypto.length,
      // steady badge: held positions down >=5% on the day. dayChange is joined
      // from the live quote cache upstream (T-04); undefined (uncached) is
      // excluded naturally since `undefined <= -5` is false.
      heldThroughDrop: held.filter((p) => p.dayChange <= -5).length,
      councilSize: (await getCouncilSize(userId)) ?? 0,
      positionOpen: held.length > 0 ? 1 : 0,
    }
  }

  return { read }
}
