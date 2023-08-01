const sequelize = require('sequelize');
const Op = sequelize.Op;
const Response = require("../helper/api-response");
const Helper = require("../helper/common-helper");
const SQLToken = process.env.MY_SQL_TOKEN;
const AES = require('mysql-aes');

/**
 * @description API to get vendor table data.
 * @exception Summerised Carrier table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data, page, page_size, search_name, col_name, order_by} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getVendorTableData = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data, page, page_size, search_name, col_name, order_by, min_range, max_range } = req.body;
        let page_server = (page) ? parseInt(page - 1) : 0;
        let page_server_size = (page_size) ? parseInt(page_size) : 30;
        const where = {}
        if (region_id || year || search_name) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push({ 'year': year })
            }
            if (quarter) {
                where[Op.and].push({ 'quarter': quarter })
            }
            if (search_name) {
                console.log("search_name.toLowerCase()", search_name.toLowerCase())
                where[Op.and].push(sequelize.where(sequelize.fn('lower', sequelize.literal('( AES_DECRYPT(UNHEX(carrier_name),"' + SQLToken + '")) ')), {
                    [Op.like]: `%${search_name.toLowerCase()}%`
                }))
            }

            if (min_range && max_range) {
                where[Op.and].push(sequelize.where(sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) ) '), {
                    [Op.between]: [min_range, max_range]
                }))
            }

        }
        let total_count = await req.db.SummerisedCarrier.findAll(
            {
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('carrier_name')), 'total_count']],
                where: where,
            }
        );

        let averageIntensity = await req.db.SummerisedCarrier.findOne(
            {
                attributes: [[sequelize.literal('( SELECT AVG((AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / (AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '"))) )'), 'average'],
                [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '"))/ 1000000)'), 'average_emission']],

                where: where,
            }
        );

        let getVendorEmissionData = await req.db.SummerisedCarrier.findAll(Helper.paginate(
            {
                attributes: ['id',
                    [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                    [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '"))/1000000))'), 'emissions'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                    "carrier",
                    'carrier_name',
                    'carrier_logo'
                ],
                where: where,
                group: ['carrier_name'],
                order: [[col_name ? col_name === 'carrier_name' ? sequelize.literal('( AES_DECRYPT(UNHEX(carrier_name),"' + SQLToken + '")) ') : col_name : "intensity", order_by ? order_by : "desc"]],
            }, {
            page: page_server,
            pageSize: page_server_size
        }
        ));
        //check getVendorTableData is matched or not then exec
        if (getVendorEmissionData) {

            let average = Helper.roundToDecimal(averageIntensity.dataValues.average);
            if (toggel_data == 1) {
                average = (averageIntensity.dataValues.average_emission);
            }

            for (const property of getVendorEmissionData) {
                property.dataValues.carrier_name = AES.decrypt(property.dataValues.carrier_name, SQLToken);
                property.dataValues.carrier = AES.decrypt(property.dataValues.carrier, SQLToken);
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = property.dataValues.emission;
                }
                if (compareValue > average) {
                    property.dataValues.color = '#d8856b';
                } else {
                    property.dataValues.color = '#215154';
                }
            }

            const data = {
                responseData: getVendorEmissionData,
                average: Helper.roundToDecimal(average),
                pagination: {
                    page: page_server,
                    page_size: page_server_size,
                    total_count: total_count.length,
                }
            };

            return Response.customSuccessResponseWithData(res, 'Get Vendor Table Data', data, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
    }
}

/**
 * @description API to get vendor emission data graph.
 * @exception Summerised Carrier table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, page, page_size, search_name, col_name, order_by} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getVendorEmissionData = async (req, res) => {
    try {
        let { region_id, year, quarter, page, page_size, search_name, col_name, order_by, min_range, max_range } = req.body;
        let page_server = (page) ? parseInt(page - 1) : 0;
        let page_server_size = (page_size) ? parseInt(page_size) : 30;
        const where = {}
        if (region_id || year || quarter || search_name) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push({ 'year': year })
            }
            if (quarter) {
                where[Op.and].push({ 'quarter': quarter })
            }
            if (search_name) {
                where[Op.and].push(sequelize.where(sequelize.fn('lower', sequelize.literal('( AES_DECRYPT(UNHEX(carrier_name),"' + SQLToken + '")) ')), {
                    [Op.like]: `%${search_name.toLowerCase()}%`
                }))
                // where[Op.and].push(sequelize.where(sequelize.literal('( AES_DECRYPT(UNHEX(carrier_name),"' + SQLToken + '")) '), {
                //     [Op.like]: `%${search_name}%`
                // }))
            }
            if (min_range && max_range) {
                where[Op.and].push(sequelize.where(sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) ) '), {
                    [Op.between]: [min_range, max_range]
                }))
            }


        }

        let total_count = await req.db.SummerisedCarrier.findAll(
            {
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('carrier_name')), 'total_count']],
                where: where,
            }
        );
        let averageIntensity = await req.db.SummerisedCarrier.findOne(
            {
                attributes: [[sequelize.literal('( SELECT AVG(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '"))) )'), 'average']],
                where: where,
            }
        );

        let getVendorEmissionData = await req.db.SummerisedCarrier.findAll(Helper.paginate(
            {
                attributes: ['id',
                    [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                    [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '"))/1000000))'), 'emissions'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                    'data_strength',
                    'carrier_name',
                    'carrier_logo'
                ],
                where: where,
                group: ['carrier_name'],
                order: [[col_name ? col_name === 'carrier_name' ? sequelize.literal('( AES_DECRYPT(UNHEX(carrier_name),"' + SQLToken + '")) ') : col_name : "intensity", order_by ? order_by : "desc"]],
            }, {
            page: page_server,
            pageSize: page_server_size
        }
        ));



        //check password is matched or not then exec
        if (getVendorEmissionData) {
            //new codde
            let toggel_data = 0;


            const average = Helper.roundToDecimal(averageIntensity.dataValues.average);



            let responseData = [];
            for (const property of getVendorEmissionData) {
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = property.dataValues.emissions;
                }
                if (compareValue > average) {
                    responseData.push({
                        x: property.dataValues.emissions,
                        y: property.dataValues.intensity,
                        z: property.dataValues.shipment_count,
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        carrier_logo: property.dataValues.carrier_logo,
                        data_strength: (property.dataValues.data_strength) ? AES.decrypt(property.dataValues.data_strength, SQLToken) : null,
                        color: '#d8856b'
                    })
                } else {
                    responseData.push({
                        x: property.dataValues.emissions,
                        y: property.dataValues.intensity,
                        z: property.dataValues.shipment_count,
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        carrier_logo: property.dataValues.carrier_logo,
                        data_strength: (property.dataValues.data_strength) ? AES.decrypt(property.dataValues.data_strength, SQLToken) : null,
                        color: '#215154'
                    })
                }
            }
            const data = {
                responseData: responseData,
                average: Helper.roundToDecimal(average),
                pagination: {
                    page: page_server,
                    page_size: page_server_size,
                    total_count: total_count.length,
                }
            };
            return Response.customSuccessResponseWithData(res, 'Vendor Emissions', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}


/**
 * @description API to get vendor carrier details.
 * @exception Summerised Carrier table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {id} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getVendorCarrierOverview = async (req, res) => {

    const { id } = req.params
    let getVendorEmissionData = await req.db.SummerisedCarrier.findOne(
        {
            attributes: ['id',
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '"))/1000000))'), 'emissions'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
            ],
            where: {
                carrier: AES.encrypt(id, SQLToken)
            },
            group: ['carrier_name'],
        }
    );
    let getTotalVendorEmissionData = await req.db.SummerisedCarrier.findOne(
        {
            attributes: ['id',
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '"))/1000000))'), 'emissions'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
            ],
            group: ['carrier_name'],
        }
    );

    let summerisedCarrierdata = await req.db.SummerisedCarrier.findOne(
        {
            attributes: [
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                'carrier_name'
            ],
            where: {
                carrier: AES.encrypt(id, SQLToken)
            },
        }
    );

    let baseLine = getTotalVendorEmissionData?.dataValues?.intensity * (20 / 100);


    const data = {
        responseData: {
            carrier_name: AES.decrypt(summerisedCarrierdata.dataValues.carrier_name, SQLToken),
            intensity: summerisedCarrierdata.dataValues.intensity,
            data: [{
                year: 2022,
                intensity: getTotalVendorEmissionData?.dataValues?.intensity
            }, {
                year: 2022,
                intensity: getVendorEmissionData?.dataValues?.intensity
            }],
            industrialAverage: 85,
            baseLine: Helper.roundToDecimal(getTotalVendorEmissionData?.dataValues?.intensity + baseLine),
            vendorEmissionData: getVendorEmissionData,
            totalVendorEmissionData: getTotalVendorEmissionData,
            max: getTotalVendorEmissionData?.dataValues?.intensity
        },

    };
    return Response.customSuccessResponseWithData(res, 'Vendor Emissions', data, 200);

}

/**
 * @description API to get lane for particular carrier.
 * @param {id, year, quarter, toggel_data, page_size} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneBreakdown = async (req, res) => {

    let { id, year, quarter, toggel_data, page_size } = req.body;
    let page_server_size = (page_size) ? parseInt(page_size) : 10;
    const where = {}
    where[Op.and] = []
    where[Op.and].push({ carrier: AES.encrypt(id, SQLToken) })

    where[Op.and].push(sequelize.where(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) '), {
        [Op.not]: 0
    }));
    if (year || quarter) {
        if (year) {
            where[Op.and].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), year)
            )
        }
        if (quarter) {
            where[Op.and].push(sequelize.where(sequelize.fn('quarter', sequelize.col('date')), quarter)
            )
        }
    }

    let order_by = 'intensity';
    if (toggel_data == 1) {
        order_by = 'emission';
    }

    let getVendorEmissionData = await req.db.Emission.findAll(Helper.paginate(
        {
            attributes: ['id',

                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/1000000))'), 'emissions'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                'name',
            ],
            where: where,
            group: ['name'],
            order: [[order_by, "asc"]],
        }, {
        page: 0,
        pageSize: page_server_size
    }));


    let averageData = await req.db.Emission.findOne(
        {
            attributes: [
                [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") / AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'average_intensity'],
                [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000)'), 'average_emission']
            ],
            where: where
        }
    );

    let emissionTotal = await req.db.Emission.findOne(
        {
            attributes: ['id',
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/1000000))'), 'emissions'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                'name',
            ],
            where: {
                carrier: AES.encrypt(id, SQLToken),
            },
        });

    let getVendorEmissionDetractor = await req.db.Emission.findAll(Helper.paginate(
        {
            attributes: ['id',
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/1000000))'), 'emissions'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                'name',
            ],
            where: where,

            group: ['name'],
            order: [[order_by, "desc"]],
        }, {
        page: 0,
        pageSize: page_server_size
    }));

    let contributor = [];
    let detractor = [];
    let average = (averageData.dataValues.average_intensity);
    if (toggel_data == 1) {
        average = (averageData.dataValues.average_emission);
    }

    const seen = new Set();
    let combinedData = [...getVendorEmissionData, ...getVendorEmissionDetractor];
    const filteredArr = combinedData.filter(el => {
        const duplicate = seen.has(el.dataValues.name);
        seen.add(el.dataValues.name);
        return !duplicate;
    });

    for (const property of filteredArr) {
        let compareValue = property.dataValues.intensity;
        if (toggel_data == 1) {
            compareValue = (property.dataValues.emissions);
        }
        if (compareValue > average) {
            detractor.push({
                name: AES.decrypt(property.dataValues.name, SQLToken),
                total_emission: property.dataValues.emissions,
                total_intensity: property.dataValues.intensity,
                shipment_count: property.dataValues.shipment_count,
                color: '#215154'
            })
        } else {

            contributor.push({
                name: AES.decrypt(property.dataValues.name, SQLToken),
                total_emission: property.dataValues.emissions,
                total_intensity: property.dataValues.intensity,
                shipment_count: property.dataValues.shipment_count,
                color: '#d8856b'
            });
        }
    }

    detractor = detractor.slice(0);
    detractor.sort(function (a, b) {
        return a.value - b.value;
    });
    contributor = contributor.slice(0);
    contributor.sort(function (a, b) {
        return b.value - a.value;
    });

    const data = {
        responseData: {
            contributor,
            detractor,
            emissionTotal: emissionTotal?.dataValues?.emissions,
            average: averageData
        },

    };
    return Response.customSuccessResponseWithData(res, 'Vendor Emissions', data, 200);



}


/**
 * @description API to get lane carrier name.
 * @param {*} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneCarrierName = async (req, res) => {
    try {

        let carrierList = await req.db.SummerisedCarrier.findAll(
            {
                attributes: [
                    [sequelize.fn('DISTINCT', sequelize.col('carrier')), 'carrier_code'],
                    'carrier_name',
                ],
                group: ['carrier_name'],
                order: [sequelize.literal('( AES_DECRYPT(UNHEX(carrier_name),"' + SQLToken + '")) ')]
            },

        );


        const carrierDto = []
        for (const property of carrierList) {
            carrierDto.push({
                carrier_code: AES.decrypt(property.dataValues.carrier_code, SQLToken),
                carrier_name: AES.decrypt(property.dataValues.carrier_name, SQLToken)
            })
        }
        const data = {
            carrierList: carrierDto
        };
        return Response.customSuccessResponseWithData(res, 'Vendor Emissions', data, 200);
    } catch (e) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }

}


/**
 * @description API to get vendor emission comparison.
 * @param {*} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getVendorEmissionComparison = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data, carrier1, carrier2 } = req.body;
        let carrierArray = [carrier1, carrier2];
        const where = {};
        where[Op.and] = []
        where[Op.and].push(sequelize.where(sequelize.literal('( AES_DECRYPT(UNHEX(carrier),"' + SQLToken + '")) '), {
            [Op.in]: carrierArray
        }));
        if (region_id || year || quarter) {

            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), year));
            }
            if (quarter) {
                where[Op.and].push(sequelize.where(sequelize.fn('quarter', sequelize.col('date')), quarter));
            }
        }

        let attributeQuery = (toggel_data == 0) ?
            [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'] :
            [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/1000000))'), 'emission'];

        let getVendorEmissionData = await req.db.Emission.findAll(
            {
                attributes: ['id', attributeQuery,
                    [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                    [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/1000000))'), 'emission'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipments'],
                    'carrier_name',
                    'carrier',
                    'carrier_logo'
                ],
                where: where,
                group: ['carrier']
            });

        if (getVendorEmissionData) {
            let data = [];
            let baseDataIntensity = [];
            let baseDataEmission = [];
            let responseData = [];

            for (const property1 in carrierArray) {
                let searchProperty = getVendorEmissionData.find((x) => AES.decrypt(x.dataValues.carrier, SQLToken) === carrierArray[property1]);
                if (searchProperty) {
                    let carrier_name = AES.decrypt(searchProperty.dataValues.carrier_name, SQLToken);
                    let carrier = AES.decrypt(searchProperty.dataValues.carrier, SQLToken);
                    responseData.push({
                        intensity: searchProperty.dataValues.intensity,
                        emission: searchProperty.dataValues.emission,
                        shipments: searchProperty.dataValues.shipments,
                        carrier_name: carrier_name,
                        carrier: carrier,
                        carrier_logo: searchProperty.dataValues.carrier_logo
                    });
                    baseDataIntensity.push(searchProperty.dataValues.intensity);
                    baseDataEmission.push(searchProperty.dataValues.emission);
                } else {
                    responseData.push({
                        intensity: 0,
                        emission: 0,
                        shipments: 0,
                        carrier_name: '',
                        carrier: carrierArray[property1]
                    });
                    baseDataIntensity.push(0);
                    baseDataEmission.push(0);
                }
            }

            let maxIntensity = Math.max(...baseDataIntensity);
            let maxEmission = Math.max(...baseDataEmission);
            let baseIntensity = maxIntensity * (20 / 100);
            let baseEmission = maxEmission * (20 / 100);

            data.push({
                dataset: responseData,
                label: carrierArray,
                baseLineIntensity: Helper.roundToDecimal(maxIntensity + baseIntensity),
                maxIntensity: Helper.roundToDecimal(maxIntensity),
                graphMaxIntensity: Helper.roundToDecimal((maxIntensity + baseIntensity) + (maxIntensity + baseIntensity) * (15 / 100)),
                baseLineEmission: Helper.roundToDecimal(maxEmission + baseEmission),
                maxEmission: Helper.roundToDecimal(maxEmission),
                graphMaxEmission: Helper.roundToDecimal((maxEmission + baseEmission) + (maxEmission + baseEmission) * (15 / 100))
            })
            return Response.customSuccessResponseWithData(res, 'Vendor Emissions Comparison Data', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get carrier overview details.
 * @param {region_id, year, quarter} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneCarrierOverviewDetail = async (req, res) => {
    try {
        let { region_id, year, quarter } = req.body;

        const where = {}
        if (region_id || year || quarter) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push({ "year": year })
            }
            if (quarter) {
                where[Op.and].push({ "quarter": quarter })
            }
        }

        const getRegionEmissions = await req.db.SummerisedEmission.findAll({
            attributes: ['id',
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '"))/1000000))'), 'emissions'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
            ],
            where: where,
        });
        const data = {
            carrierDto: getRegionEmissions
        };
        return Response.customSuccessResponseWithData(res, 'Vendor Emissions', data, 200);
    } catch (e) {
        console.log("region_id, year, quarter getRegionEmissions e", e)
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}
