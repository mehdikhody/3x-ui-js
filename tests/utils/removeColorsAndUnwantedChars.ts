export const removeColorsAndUnwantedChars = (str: string) => {
    const noColors = str.replace(/\x1B\[[0-?9;]*[mG]/g, "");
    return noColors.replace(/%/g, "");
};
