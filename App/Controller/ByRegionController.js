const sequelize = require('sequelize');
const Op = sequelize.Op;
const Helper = require("../helper/common-helper");
const Response = require("../helper/api-response");
const SQLToken = process.env.MY_SQL_TOKEN;
const AES = require('mysql-aes');
const carrier_logo = require('../models/carrier_logo');

/**
 * @description API to get carrier comparison graph details.
 * @exception Summerised Carrier table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getRegionCarrierComparisonGraph = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data} = req.body;

        const where = {}
        where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));
        if (region_id || year || quarter) {
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push({ 'YEAR': year });
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
        let averageIntensity = await req.db.SummerisedCarrier.findOne(
            {
                attributes: [
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '") / AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'average_intensity'],
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '"))/ 1000000)'), 'average_emission']
                ],
                where: where,
            }
        );

        let getTopCarrierEmissionData = await req.db.SummerisedCarrier.findAll(
            {
                attributes: ['id', 'carrier',
                    'carrier_name',
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                ],
                where: where,
                group: ['carrier_name'],
                order: [[order_by, 'asc']],
                limit:10
            });
           
        let getButtomCarrierEmissionData = await req.db.SummerisedCarrier.findAll(
            {
                attributes: ['id', 'carrier',
                    'carrier_name',
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                ],
                where: where,
                group: ['carrier_name'],
                order: [[order_by, 'desc']],
                limit:10
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
            for (const property of getTopCarrierEmissionData) {
                let data = Helper.roundToDecimal(property.dataValues.intensity - average);
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    data = Helper.roundToDecimal((property.dataValues.emission / convertToMillion) - average);
                }

                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        value: Math.abs(data),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity:property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        value: Math.abs(data),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity:property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#215154'
                    });
                }
            }

            for (const property of getButtomCarrierEmissionData) {
                let data = Helper.roundToDecimal(property.dataValues.intensity - average);
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    data = Helper.roundToDecimal((property.dataValues.emission / convertToMillion) - average);
                }
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        value: Math.abs(data),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        value: Math.abs(data),
                        total_emission: property.dataValues.emission / convertToMillion ,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#215154'
                    });
                }
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
            const response = {
                contributor: contributor,
                detractor: detractor,
                unit: unit,
                average: Helper.roundToDecimal(average)
            };
            return Response.customSuccessResponseWithData(res, 'Carrier Emissions', response, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
    }
}



