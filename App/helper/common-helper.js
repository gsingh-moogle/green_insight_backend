exports.roundToDecimal =(number) => { 
    return parseFloat((Math.round(number * 10) / 10).toFixed(1));
}


exports.paginate = (query, { page, pageSize }) => {
    const offset = page * pageSize;
    const limit = pageSize;

    return {
        ...query,
        offset,
        limit,
    };
};