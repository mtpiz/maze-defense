// Simulation positions name cell centers at integer coordinates; art cells start at their corners.
export const eventPoint = (xMilli: number, yMilli: number) => ({ x: xMilli / 1000 + .5, y: yMilli / 1000 + .5 });
