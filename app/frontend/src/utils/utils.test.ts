import { createNumberArray } from "./arrayUtils";

describe("createNumberArray tests", () => {
    it("should create an array of numbers from 1 to 5", () => {
        expect(createNumberArray(5)).toEqual([1, 2, 3, 4, 5]);
    });
});
