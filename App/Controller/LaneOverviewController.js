const sequelize = require('sequelize');
const Op = sequelize.Op;
const Helper = require("../helper/common-helper");
const Response = require("../helper/api-response");
const SQLToken = process.env.MY_SQL_TOKEN;
const AES = require('mysql-aes');
const carrier_logo = require('../models/carrier_logo');

/**
 * @description API to get lane overview details.
 * @param {region_id, year, quarter, lane_name} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneOverviewDetails = async (req, res) => {
    try {
        let { region_id, year, quarter, lane_name } = req.body;


        const where = {}
        where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(name),"' + SQLToken + '") = "' + lane_name + '" )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));
        if (region_id || year || quarter) {
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
        }

        let geLaneOverviewDetails = await req.db.Emission.findOne(
            {
                attributes: [
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000 )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                    'source',
                    'destination'
                ],
                where: where
            });


        if (geLaneOverviewDetails) {
            geLaneOverviewDetails.dataValues.source = AES.decrypt(geLaneOverviewDetails.dataValues.source, SQLToken);
            geLaneOverviewDetails.dataValues.destination = AES.decrypt(geLaneOverviewDetails.dataValues.destination, SQLToken);
            return Response.customSuccessResponseWithData(res, 'Lane Overview Data', geLaneOverviewDetails, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get lane reduction.
 * @param {region_id, year, quarter, lane_name} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneReductionGraph = async (req, res) => {
    try {
        let { region_id, year, lane_name, toggel_data} = req.body;
        let current_year = parseInt(new Date().getFullYear() - 1);
        let next_year = current_year + 1;
        const where = {}
        where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(name),"' + SQLToken + '") = "' + lane_name + '" )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));
        if (region_id || year) {
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.or] = []
                current_year = parseInt(year);
                next_year = parseInt(year) + 1;
                where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), current_year))
                where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), next_year))
            }
        }

        let attributeArray = [ 
            [ sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"'+SQLToken+'")) / 1000000)'),'emission'],
            [sequelize.literal('quarter(date)'),'quarter'],
            [sequelize.literal('year(date)'),'year']
        ];
        if(toggel_data == 1) {
            attributeArray = [ 
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")))'), 'emission'],
                [sequelize.literal('quarter(date)'),'quarter'],
                [sequelize.literal('year(date)'),'year']
            ];
        }

        let getRegionEmissionsReduction = await req.db.Emission.findAll({
            attributes: attributeArray,
            where: where,
            group: [sequelize.fn('YEAR', sequelize.col('date')), sequelize.fn('quarter', sequelize.col('date'))],
            order: [sequelize.fn('YEAR', sequelize.col('date')), sequelize.fn('quarter', sequelize.col('date'))]
        });
        if (getRegionEmissionsReduction) {
            let company_level = [];
            let targer_level = [];
            let max_array = [];
            let base_level = [];
            let intialCompanyLevel;
            let last_intensity = [];
            let last_target = [];
            for (const property of getRegionEmissionsReduction) {
                company_level.push(Helper.roundToDecimal(property.dataValues.emission));
                if (intialCompanyLevel == undefined) {
                    intialCompanyLevel = property.dataValues.emission;
                }
                intialCompanyLevel = Helper.roundToDecimal((intialCompanyLevel - (intialCompanyLevel * 40 / 100)));
                targer_level.push(intialCompanyLevel);
                max_array.push(property.dataValues.emission);
                last_intensity = property.dataValues.emission;
                last_target = intialCompanyLevel;
            }
            if (next_year == 2023) {
                for (let i = 1; i < 4; i++) {
                    last_intensity = Helper.roundToDecimal((last_intensity - (last_intensity * 7 / 100)));
                    company_level.push(last_intensity);
                    last_target = Helper.roundToDecimal((last_target - (last_target * 10 / 100)));
                    targer_level.push(last_target);
                }
            }
            let max = Math.max(...max_array);
            let maxData = Helper.roundToDecimal(max + (max * 30 / 100));
            base_level.push(maxData);
            let data = {
                company_level: company_level,
                targer_level: targer_level,
                base_level: base_level,
                max: Helper.roundToDecimal(maxData + (maxData * 20 / 100)),
                year: [current_year, next_year]
            }
            return Response.customSuccessResponseWithData(res, 'Emissions Reduction', data, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get lane comparison graph data.
 * @exception Carrier Emissions table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data, lane_name} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getLaneCarrierComparisonGraph = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data, lane_name } = req.body;

        const where = {}
        where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(name),"' + SQLToken + '") = "' + lane_name + '" )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));
        if (region_id || year || quarter) {
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push({ 'year': year });

            }
            if (quarter) {
                where[Op.and].push({ 'quarter': quarter });

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

        let getTopCarrierEmissionData = await req.db.CarrierEmissions.findAll(
            {
                attributes: [
                    'carrier_name',
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                ],
                where: where,
                group: ['carrier_name'],
                order: [[order_by, 'asc']],
                limit: 10
            });

        let getButtomCarrierEmissionData = await req.db.CarrierEmissions.findAll(
            {
                attributes: [
                    'carrier_name',
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                ],
                where: where,
                group: ['carrier_name'],
                order: [[order_by, 'desc']],
                limit: 10
            }
        );

        if (getTopCarrierEmissionData || getButtomCarrierEmissionData) {
            let convertToMillion = 1000000;
            let contributor = [];
            let detractor = [];
            let unit = 'g';
            let average = (averageIntensity.dataValues.average_intensity);
            if (toggel_data == 1) {
                average = (averageIntensity.dataValues.average_emission);
                unit = 'tCo2e';
            }
            const seen = new Set();
            let combinedData = [...getTopCarrierEmissionData, ...getButtomCarrierEmissionData];
            const filteredArr = combinedData.filter(el => {
                const duplicate = seen.has(el.carrier_name);
                seen.add(el.carrier_name);
                return !duplicate;
            });
            for (const property of filteredArr) {
                let difference = Helper.roundToDecimal(property.dataValues.intensity - average);
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    difference = Helper.roundToDecimal((property.dataValues.emission / convertToMillion) - average);
                }

                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#215154'
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
            return Response.customSuccessResponseWithData(res, 'Carrier Emissions', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}