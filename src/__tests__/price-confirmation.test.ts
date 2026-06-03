import { priceConfirmationUpdate } from '@/lib/utils'

// Mirrors the booking `set_price` action. The DB contract trigger (migration
// 009) forbids unsetting an existing confirmation when the price is unchanged,
// so re-proposing the same price must preserve the counterparty's confirmation.
describe('priceConfirmationUpdate', () => {
  it('auto-confirms the customer when the customer proposes a new price', () => {
    expect(
      priceConfirmationUpdate({
        proposedPrice: 500,
        currentPrice: null,
        isCustomer: true,
        isServiceiro: false,
        customerConfirmed: false,
        serviceiroConfirmed: false,
      }),
    ).toEqual({ price_confirmed_by_customer: true, price_confirmed_by_serviceiro: false })
  })

  it('auto-confirms the serviceiro when the serviceiro proposes a new price', () => {
    expect(
      priceConfirmationUpdate({
        proposedPrice: 500,
        currentPrice: null,
        isCustomer: false,
        isServiceiro: true,
        customerConfirmed: false,
        serviceiroConfirmed: false,
      }),
    ).toEqual({ price_confirmed_by_customer: false, price_confirmed_by_serviceiro: true })
  })

  it('clears the counterparty confirmation when the price actually changes', () => {
    // Customer had already confirmed 500; serviceiro counters with 750.
    expect(
      priceConfirmationUpdate({
        proposedPrice: 750,
        currentPrice: 500,
        isCustomer: false,
        isServiceiro: true,
        customerConfirmed: true,
        serviceiroConfirmed: false,
      }),
    ).toEqual({ price_confirmed_by_customer: false, price_confirmed_by_serviceiro: true })
  })

  it('preserves the counterparty confirmation when re-proposing the same price', () => {
    // Regression: customer already confirmed 500; serviceiro re-sends 500.
    // The customer's confirmation must NOT be unset (DB trigger would reject it).
    expect(
      priceConfirmationUpdate({
        proposedPrice: 500,
        currentPrice: 500,
        isCustomer: false,
        isServiceiro: true,
        customerConfirmed: true,
        serviceiroConfirmed: false,
      }),
    ).toEqual({ price_confirmed_by_customer: true, price_confirmed_by_serviceiro: true })
  })

  it('does not resurrect an unconfirmed counterparty when re-proposing the same price', () => {
    expect(
      priceConfirmationUpdate({
        proposedPrice: 500,
        currentPrice: 500,
        isCustomer: true,
        isServiceiro: false,
        customerConfirmed: false,
        serviceiroConfirmed: false,
      }),
    ).toEqual({ price_confirmed_by_customer: true, price_confirmed_by_serviceiro: false })
  })
})
