const sequelize = require('sequelize');
const Op = sequelize.Op;
const Helper = require("../helper/common-helper");
const Response = require("../helper/api-response");
const SQLToken = process.env.MY_SQL_TOKEN;
const AES = require('mysql-aes');

/**
 * @description API to get High intensity graph data.
 * @param {region_id, year, quarter, toggel_data, lane_name} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneTableDataHighIntensity = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data } = req.body;
        const where = {};
        const regionWhere = {};
        if (region_id || year) {
            where[Op.and] = []
            regionWhere[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('Emission.date')), year)
                )
            }

            if (quarter) {
                where[Op.and].push(sequelize.where(sequelize.fn('quarter', sequelize.col('Emission.date')), quarter)
                )
            }
        }


        let getLaneTableData = await req.db.Emission.findAll({
            attributes: ['region_id', ['name', 'lane_name'],
                [sequelize.fn('date_format', sequelize.col(`Emission.date`), '%M %Y'), 'contract'],
                [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")), 1) )'), 'emission']],
            where: where,
            order: [['intensity', 'desc']],
            group: ['lane_name'],
            limit: 10,
            raw: true
        });

        if (getLaneTableData) {
            let convertToMillion = 1000000;
            let total = [];
            for (const property of getLaneTableData) {
                let data = property.intensity;
                if (toggel_data == 1) {
                    data = parseFloat((property.emission / convertToMillion).toFixed(2));
                }
                total.push(data);
            }

            const average = Helper.roundToDecimal(total.reduce((a, b) => a + b, 0) / total.length);
          
            for (const property of getLaneTableData) {
                let emissionData = property.intensity;
                property.lane_name = (property.lane_name) ? AES.decrypt(property.lane_name, SQLToken) : property.lane_name;
                if (toggel_data == 1) {
                    emissionData = parseFloat((property.emission / convertToMillion).toFixed(2));
                }
                if (emissionData > average) {
                    property.Lane = {
                        name: property.lane_name,
                        color: '#d8856b'
                    };
                 
                }
            }

            return Response.customSuccessResponseWithData(res, 'Get Lane Table Data', getLaneTableData, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
    }
}

/**
 * @description API to get low intensity table data.
 * @param {region_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneTableDataLowIntensity = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data } = req.body;
        const where = {};
        const regionWhere = {};
        if (region_id || year) {
            where[Op.and] = []
            regionWhere[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('Emission.date')), year)
                )
            }

            if (quarter) {
                where[Op.and].push(sequelize.where(sequelize.fn('quarter', sequelize.col('Emission.date')), quarter)
                )
            }
        }

        let getLaneTableData = await req.db.Emission.findAll({
            attributes: ['region_id', ['name', 'lane_name'], [sequelize.fn('date_format', sequelize.col(`Emission.date`), '%M %Y'), 'contract'],
                [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 2) )'), 'intensity'],
                [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")), 2) )'), 'emission']],
            where: where,
            order: [['intensity', 'desc']],
            group: ['lane_name'],
            limit: 10,
            raw: true
        });
        if (getLaneTableData) {
            let convertToMillion = 1000000;
            let total = [];
            for (const property of getLaneTableData) {
                let data = property.intensity;
                if (toggel_data == 1) {
                    data = parseFloat((property.emission / convertToMillion).toFixed(2));
                }
                total.push(data);
            }

            const average = total.reduce((a, b) => a + b, 0) / total.length;
            let showData = [];
            for (const property of getLaneTableData) {
                property.lane_name = (property.lane_name) ? AES.decrypt(property.lane_name, SQLToken) : property.lane_name;
                let emissionData = property.intensity;
                if (toggel_data == 1) {
                    emissionData = parseFloat((property.emission / convertToMillion).toFixed(2));
                }
                if (emissionData < average) {
                    property.Lane = {
                        name: property.lane_name,
                        color: '#215254'
                    };
                    showData.push(property);
                }
            }
            return Response.customSuccessResponseWithData(res, 'Get Lane Table Data', showData, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
    }
}

/**
 * @description API to get intensity/emission graph data.
 * @param {region_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneEmissionData = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data } = req.body;
        const where = {}
        if (region_id || year || quarter) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
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
           order_by = sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") )');
        }

        //NEW CODE
        let getLaneEmissionData = await req.db.Emission.findAll({
            attributes: ['id', ['name', 'lane_name'],
                [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission']],
            where: where,
            group: ['lane_name'],
            order: [[order_by, 'desc']],
            limit: 10,
            raw: true
        });
       if (getLaneEmissionData) {
            let convertToMillion = 1000000;
            let contributor = [];
            let detractor = [];
            let unit = 'g';
            let total = [];

            //NEW CODE
            for (const property of getLaneEmissionData) {
                let intensityData = property.intensity;
                if (toggel_data == 1) {
                    intensityData = parseFloat((property.emission).toFixed(2));
                }
                total.push(intensityData);
            }

            const average = Helper.roundToDecimal(total.reduce((a, b) => a + b, 0) / total.length);
          
            for (const property of getLaneEmissionData) {
                let difference = Helper.roundToDecimal(property.intensity - average);
                let compareValue = property.intensity;
                if (toggel_data == 1) {
                    compareValue = property.emission;
                    difference = Helper.roundToDecimal((property.emission) - average);
                }
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property["lane_name"], SQLToken),
                        value: Math.abs(difference),
                        total_emission: Helper.roundToDecimal(property.emission / convertToMillion),
                        total_intensity: Helper.roundToDecimal(property.intensity),
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property["lane_name"], SQLToken),
                        value: Math.abs(difference),
                        total_emission: Helper.roundToDecimal(property.emission / convertToMillion),
                        total_intensity: Helper.roundToDecimal(property.intensity),
                        color: '#215154'
                    })
                }
            }

            let contributorLenght = contributor.length;
            if (contributorLenght > 0) {
                contributor[contributorLenght - 1]['color'] = '#efede9';
            }
            let detractorLenght = detractor.length;
            if (detractorLenght > 0) {
                detractor[0]['color'] = '#efede9';
            }
            const data = {
                contributor: contributor,
                detractor: detractor,
                unit: unit,
                average: Helper.roundToDecimal(average)
            };
            return Response.customSuccessResponseWithData(res, 'Lane Emissions', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
    }
}

/**
 * @description API to get lane emission data based on pagination.
 * @exception Emission Lanes table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data, page, page_size} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneEmissionDataPagination = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data, page, page_size } = req.body;
        let page_server = (page) ? parseInt(page - 1) : 1;
        let page_server_size = (page_size) ? parseInt(page_size) : 10;
        const where = {}
        where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));
        if (region_id || year || quarter) {
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
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

        //NEW CODE
        let averageIntensity = await req.db.Emission.findOne(
            {
                attributes: [
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") / AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'average_intensity'],
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000)'), 'average_emission']
                ],
                where: where,
            }
        );


        const where1 = {}        
        where1[Op.and] = []    
        if (region_id || year || quarter) {
            if (region_id) {
                where1[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where1[Op.and].push({
                    year: year
                })
            }
            if (quarter) {
                where1[Op.and].push({ quarter: quarter });
           }
        }

        let getTopLaneEmissionData = await req.db.EmissionLanes.findAll(Helper.paginate(
            {
                attributes: ['id',                     
                    ['name', 'lane_name'],
                    [sequelize.literal('SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '"))'), 'intensity'],
                    [sequelize.literal('SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000'), 'emission'],
                    ['shipments', 'shipment_count'],
                    'region_id', 'year' 
                ],
                where: where1,
                group: ['lane_name'],          
                order: [[order_by, 'asc']],
            }, {
            page: 0,
            pageSize: page_server_size
        }
        ));

        let getButtomLaneEmissionData = await req.db.EmissionLanes.findAll(Helper.paginate(
            {
                attributes: ['id',                     
                    ['name', 'lane_name'],
                    [sequelize.literal('SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '"))'), 'intensity'],
                    [sequelize.literal('SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000'), 'emission'],
                    ['shipments', 'shipment_count'],
                    'region_id', 'year' 
                ],
                where: where1,
                group: ['lane_name'],                
                order: [[order_by, 'desc']],
            }, {
            page: 0,
            pageSize: page_server_size
        }
        ));

        if (getTopLaneEmissionData) {
            let convertToMillion = 1000000;
            let carrierArray = [];
            let contributor = [];
            let detractor = [];
            let unit = 'g';
            let average = (averageIntensity.dataValues.average_intensity);
            if (toggel_data == 1) {
                average = (averageIntensity.dataValues.average_emission);
                unit = 'tCo2e';
            }


            const seen = new Set();
            let combinedData = [...getTopLaneEmissionData, ...getButtomLaneEmissionData];
            const filteredArr = combinedData.filter(el => {
                const duplicate = seen.has(el.dataValues.lane_name);
                seen.add(el.dataValues.lane_name);
                return !duplicate;
            });

            for (const property of filteredArr) {
                let difference = Helper.roundToDecimal(property.dataValues.intensity - average);
                let compareValue = property.dataValues.intensity;
                let emission = property.dataValues.emission;
                if (toggel_data == 1) {
                    compareValue = emission;
                    difference = Helper.roundToDecimal((emission) - average);
                }
                let lane_name = (property.dataValues.lane_name)?AES.decrypt(property.dataValues.lane_name, SQLToken):null;
                if (compareValue > average) {
                    contributor.push({
                        name: lane_name,
                        value: Math.abs(difference),
                        total_emission: emission,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: AES.decrypt(property.dataValues.shipment_count, SQLToken),
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: lane_name,
                        value: Math.abs(difference),
                        total_emission: emission,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: AES.decrypt(property.dataValues.shipment_count, SQLToken),
                        color: '#215154'
                    });
                }

                carrierArray.push(property.dataValues.lane_name)

            }

            const whereCarrier = {}

            whereCarrier[Op.and] = []
            whereCarrier[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
            whereCarrier[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));
            whereCarrier[Op.and].push({ 'name': carrierArray })
            if (region_id || year || quarter) {
                if (region_id) {
                    whereCarrier[Op.and].push({
                        region_id: region_id
                    })
                }
                if (year) {
                      whereCarrier[Op.and].push({ 'year': year });
                   
                }
                if (quarter) {
                     whereCarrier[Op.and].push({ 'quarter': quarter });
                }
            }

            let getEmissionCarrierData = await req.db.CarrierEmissions.findAll(
                {
                    attributes: ['id', ['name', 'lane_name'], 'carrier_name', 'carrier',
                        [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                        [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                        [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],

                    ],
                    where: whereCarrier,
                    include: [
                        {
                            model: req.db.CarrierLogo,
                            attributes: [['path', 'carrier_logo']],
                            on: {
                                'carrier_code': { [Op.eq]: sequelize.col('CarrierEmissions.carrier') },
                            }
                        }],
                    group: ['carrier', 'lane_name'],
                }
            );

            let carrierData = [];
            for (const property of getEmissionCarrierData) {
                carrierData.push({
                    carrier_name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                    lane_name: AES.decrypt(property.dataValues.lane_name, SQLToken),
                    carrier: AES.decrypt(property.dataValues.carrier, SQLToken),
                    emission: property.dataValues.emission / convertToMillion,
                    intensity: Helper.roundToDecimal(property.dataValues.intensity),
                    carrier_logo: property.CarrierLogo.dataValues.carrier_logo,
                    shipment_count: property.dataValues.shipment_count
                })
            }

            detractor = detractor.slice(0);
            detractor.sort(function(a,b) {
                return a.value - b.value;
            });
            contributor = contributor.slice(0);
            contributor.sort(function(a,b) {
                return b.value - a.value;
            });

            let contributorLenght = contributor.length;
            if (contributorLenght > 0) {
                contributor[contributorLenght - 1]['color'] = '#efede9';
            }
            let detractorLenght = detractor.length;
            if (detractorLenght > 0) {
                detractor[0]['color'] = '#efede9';
            }
            const data = {
                contributor: contributor,
                detractor: detractor,
                carrier: carrierData,
                unit: unit,
                average: Helper.roundToDecimal(average),
                pagination: {
                    page: page_server,
                    page_size: page_server_size,
                    total_count: 10,
                }
            };
            return Response.customSuccessResponseWithData(res, 'Lane Emissions', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
    }
}

/**
 * @description API to get lane emission data based on pagination.
 * @exception Carrier Emissions table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data, page, page_size, search_name, col_name, order_by, lane_name} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneCarrierTableData = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data, page, page_size, search_name, col_name, order_by, lane_name } = req.body;
        let page_server = (page) ? parseInt(page - 1) : 0;
        let page_server_size = (page_size) ? parseInt(page_size) : 30;
        const where = {}
        if (region_id || year || search_name || lane_name) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), year))
            }
            if (quarter) {
                where[Op.and].push(sequelize.where(sequelize.fn('quarter', sequelize.col('date')), quarter))
            }
            if (search_name) {
                where[Op.and].push(sequelize.where(sequelize.fn('lower', sequelize.literal('( AES_DECRYPT(UNHEX(carrier_name),"' + SQLToken + '")) ')), {
                    [Op.like]: `%${search_name.toLowerCase()}%`
                }))
            }
            if (lane_name) {
                where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(name),"' + SQLToken + '") = "'+lane_name+'" )'))
             }
        }
        let total_count = await req.db.Emission.findAll(
            {
                attributes: [[sequelize.fn('DISTINCT', sequelize.col('carrier_name')), 'total_count']],
                where: where,
            }
        );

        let averageIntensity = await req.db.Emission.findOne(
            {
                attributes: [[sequelize.literal('( SELECT AVG(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '"))) )'), 'average']],
                where: where,
            }
        );

        let getVendorEmissionData = await req.db.CarrierEmissions.findAll(Helper.paginate(
            {
                attributes: ['id',
                    [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                    [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/1000000))'), 'emissions'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                   
                    "carrier",
                    'carrier_name',
                    'carrier_logo'
                ],
                where: where,
                group: ['carrier_name'],
                order: [[col_name ? col_name : "intensity", order_by ? order_by : "desc"]],
            }, {
            page: page_server,
            pageSize: page_server_size
        }
        ));
        //check getVendorTableData is matched or not then exec
        if (getVendorEmissionData) {

            const average = Helper.roundToDecimal(averageIntensity.dataValues.average);

            for (const property of getVendorEmissionData) {
                let compareValue = property.dataValues.intensity;
                property.dataValues.carrier_name = AES.decrypt(property.dataValues.carrier_name, SQLToken);
                property.dataValues.carrier = AES.decrypt(property.dataValues.carrier, SQLToken);
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

