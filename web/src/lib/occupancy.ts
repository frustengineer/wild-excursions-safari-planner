export const ADULTS_PER_GYPSY = 6;
export const YOUNG_CHILDREN_PER_GYPSY = 2;
export const YOUNG_CHILD_MAX_AGE = 6;

export type PartyOccupancy = {
  adultCapacityTravellers: number;
  youngChildren: number;
  totalTravellers: number;
  gypsiesRequired: number;
};

/**
 * One gypsy can carry up to 6 adults/travellers aged 7+ plus up to
 * 2 children under 7. A child aged 7 or older therefore consumes the
 * same capacity as an adult for this calculation.
 */
export function calculatePartyOccupancy(
  numAdults: number,
  childAges: Array<string | number>
): PartyOccupancy {
  const parsedChildAges = childAges
    .filter((age) => age !== "")
    .map((age) => (typeof age === "number" ? age : Number(age)))
    .filter((age) => Number.isFinite(age) && age >= 0);
  const childrenWithoutAge = childAges.length - parsedChildAges.length;
  const youngChildren = parsedChildAges.filter((age) => age <= YOUNG_CHILD_MAX_AGE).length;
  const childrenUsingAdultCapacity = parsedChildAges.length - youngChildren;
  // Until an age is supplied, count the child conservatively against the
  // six-person capacity. For groups over six, Step 1 requires every age
  // before continuing and this temporary assumption is replaced immediately.
  const adultCapacityTravellers =
    Math.max(0, numAdults) + childrenUsingAdultCapacity + childrenWithoutAge;
  const totalTravellers = Math.max(0, numAdults) + childAges.length;

  return {
    adultCapacityTravellers,
    youngChildren,
    totalTravellers,
    gypsiesRequired:
      totalTravellers === 0
        ? 0
        : Math.max(
            1,
            Math.ceil(adultCapacityTravellers / ADULTS_PER_GYPSY),
            Math.ceil(youngChildren / YOUNG_CHILDREN_PER_GYPSY)
          ),
  };
}
