export function createNumberArray(n: number): number[] {
    const result: number[] = [];
    for (let i = 1; i <= n; i++) {
        result.push(i);
    }
    return result;
}
