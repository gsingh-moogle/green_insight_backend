const sequelize = require('sequelize');
const Op = sequelize.Op;
const Response = require("../helper/api-response");
const Helper = require("../helper/common-helper");
const CryptoJS = require("crypto-js");
const SQLToken = process.env.MY_SQL_TOKEN;
const DB = require("../models");
const AES = require('mysql-aes');

/**
 * @description API to get all regions.
 * @param {*} req 
 * @param {*} res 
 * @returns 
 */
exports.getRegions = async (req, res) => {
    try {
        let getRegionEmissions = await req.db.Region.findAll();
        let getCompanies = await req.db.Company.findOne({ where: { 'id': 1 } });
        //check password is matched or not then exec
        if (getRegionEmissions) {
            for (const property of getRegionEmissions) {
                property.name = AES.decrypt(property.name, SQLToken);
            }

            getCompanies.name = (getCompanies.name) ? AES.decrypt(getCompanies.name, SQLToken) : null;
            getCompanies.db_name = (getCompanies.db_name) ? AES.decrypt(getCompanies.db_name, SQLToken) : null;
            getCompanies.logo = (getCompanies.logo) ? AES.decrypt(getCompanies.logo, SQLToken) : null;
            let data = {
                regions: getRegionEmissions,
                companies: getCompanies
            }
            return Response.customSuccessResponseWithData(res, 'Region & Company Data', data, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get region emission data on the bases of year and month.
 * @exception Target level is static as of now because of no info avialble.
 * @param {region_id, company_id, year, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getRegionEmissionsMonthly = async (req, res) => {
    try {
        let { region_id, company_id, year, toggel_data } = req.body;
        const where = {}
        if (region_id || company_id || year) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (company_id) {
                where[Op.and].push({
                    company_id: company_id
                })
            }
            if (year) {
                where[Op.and].push(sequelize.where(sequelize.literal('year'), year))
            }
        }
        where[Op.or] = [];
        where[Op.or].push(sequelize.where(sequelize.literal('year'), 2020));
        where[Op.or].push(sequelize.where(sequelize.literal('year'), 2021));
        where[Op.or].push(sequelize.where(sequelize.literal('year'), 2022));
        where[Op.or].push(sequelize.where(sequelize.literal('year'), 2023));


        let getRegionEmissions;
        //OLD code Start
        if (region_id) {
            getRegionEmissions = await req.db.SummerisedEmission.findAll({
                attributes: ['id', [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'emission_per_ton'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('year'), 'year'],
                    'region_id'],
                where: where,
                include: [
                    {
                        model: req.db.Region,
                        attributes: ['name']
                    }],
                group: ['region_id',sequelize.literal('year')],
                order: [sequelize.literal('year')],
                raw: true
            });
        } else {
            getRegionEmissions = await req.db.SummerisedEmission.findAll({
                attributes: ['id', [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'emission_per_ton'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('year'), 'year'],
                    'region_id'],
                where: where,
                include: [
                    {
                        model: req.db.Region,
                        attributes: ['name']
                    }],
                group: [ sequelize.literal('year')],
                order: [ sequelize.literal('year')],
                raw: true
            });
        }

        if (getRegionEmissions) {
            let convertToMillion = 1000000 * 1000000;
            let emissionUnit = '';
            let intensityUnit = 'g';
            let dataObject = [];
            let allDataArray = [];
            let maxCountArray = [];
            let targetLevel = [];
            const colors = ['#ffcb77', '#367c90', '#c1d3c0', '#d8856b', '#5f9a80', '#215154', '#ffcb77', '#367c90', '#c1d3c0', '#d8856b'];
            const lables = [...new Set(getRegionEmissions.map(item => item.year))];
            let regions = ['OTHER'];
            if (region_id) {
                regions = [...new Set(getRegionEmissions.map(item => AES.decrypt(item['Region.name'], SQLToken)))]
            }

            for (let i = 0; i < regions.length; i++) {
                let tempDataObject = {};
                let tempArray = [];
                for (const property of getRegionEmissions) {
                    let region_name_string = (property['Region.name']) ? AES.decrypt(property['Region.name'], SQLToken) : 'OTHER';
                    if (region_id) {
                        if (region_name_string == regions[i]) {
                            let data = Helper.roundToDecimal(property.emission / property.emission_per_ton);
                            if (toggel_data == 1) {
                                data = Helper.roundToDecimal(property.emission / convertToMillion);
                            }

                            tempArray.push(data);
                            if (tempDataObject["name"] === undefined) {
                                tempDataObject.name = region_name_string;
                            }
                            if (tempDataObject["year"] === undefined) {
                                tempDataObject.year = property.year;
                            }
                        }
                    } else {
                        let data = Helper.roundToDecimal(property.emission / property.emission_per_ton);
                        if (toggel_data == 1) {
                            data = Helper.roundToDecimal(property.emission / convertToMillion);
                        }

                        tempArray.push(data);
                        if (tempDataObject["name"] === undefined) {
                            tempDataObject.name = 'All Regions';
                        }
                        if (tempDataObject["year"] === undefined) {
                            tempDataObject.year = property.year;
                        }
                    }

                }
                allDataArray.push(tempArray);
                tempDataObject.data = tempArray;
                tempDataObject.color = colors[i];
                dataObject.push(tempDataObject);
            }

            for (let i in allDataArray) {

                for (let j = 0; j < allDataArray[i].length; j++) {
                    if (maxCountArray[j] === undefined) {
                        maxCountArray[j] = allDataArray[i][j];
                    } else {
                        maxCountArray[j] += allDataArray[i][j];
                    }
                }
            }

            for (let i in maxCountArray) {
                targetLevel.push(Helper.roundToDecimal(maxCountArray[i] - (maxCountArray[i] * (20 / 100))));
            }

            let base = Math.max(...maxCountArray);
            let baseLine = Helper.roundToDecimal(base + (base * (15 / 100)));

            dataObject.push({
                name: 'company_level',
                data: maxCountArray,
            });
            dataObject.push({
                name: 'target_level',
                data: targetLevel,
            });
            dataObject.push({
                name: 'base_level',
                data: baseLine,
            });

            dataObject.push({
                name: 'Max',
                data: Helper.roundToDecimal(baseLine + (baseLine * (10 / 100))),
            });

            if (toggel_data == 1) {
                dataObject.push({
                    name: 'Unit',
                    data: emissionUnit,
                });
            } else {
                dataObject.push({
                    name: 'Unit',
                    data: intensityUnit,
                });
            }

            dataObject.push({
                name: 'lables',
                data: lables,
            });

             if (getRegionEmissions) {
             
                for (const property of getRegionEmissions) {
                    let intensityData = Helper.roundToDecimal(property.emission / property.emission_per_ton);
                    let region_name_string = (property['Region.name']) ? AES.decrypt(property['Region.name'], SQLToken) : 'OTHER';
                    property.intensity = intensityData;
                    property.regionName = region_name_string;

                }
            }
            dataObject.push({
                name: 'list',
                data: getRegionEmissions,
            });


            return Response.customSuccessResponseWithData(res, 'Region Emissions', dataObject, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);

    }
}

/**
 * @description API to get region emission data on the bases of year and month.
 * @exception Target level is static as of now because of no info avialble.
 * @param {region_id, company_id, year, toggel_data} req 
 * @param {*} res
 * @version V.1.2
 * @returns 
 */
exports.getRegionEmissionsMonthlyV2 = async (req, res) => {
    try {

        let { region_id, company_id, year, toggel_data } = req.body;

        const where = {}
        if (region_id || company_id || year) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (company_id) {
                where[Op.and].push({
                    company_id: company_id
                })
            }
            if (year) {
                where[Op.and].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), year))
            }
        }
        where[Op.or] = [];
        where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), 2020));
        where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), 2021));
        where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), 2022));
        where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), 2023));


        let getRegionEmissions;
        //OLD code Start
        if (region_id) {
            getRegionEmissions = await req.db.Emission.findAll({
                attributes: ['id', [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'emission_per_ton'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SELECT YEAR(date) )'), 'year'],
                    'region_id'],
                where: where,
                include: [
                    {
                        model: req.db.Region,
                        attributes: ['name']
                    }],
                group: ['region_id', sequelize.fn('YEAR', sequelize.col('date'))],
                order: [sequelize.fn('YEAR', sequelize.col('date'))],
                raw: true
            });
        } else {
            getRegionEmissions = await req.db.Emission.findAll({
                attributes: ['id', [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'emission_per_ton'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SELECT YEAR(date) )'), 'year'],
                    'region_id'],
                where: where,
                include: [
                    {
                        model: req.db.Region,
                        attributes: ['name']
                    }],
                group: [sequelize.fn('YEAR', sequelize.col('date'))],
                order: [sequelize.fn('YEAR', sequelize.col('date'))],
                raw: true
            });
        }
        if (getRegionEmissions) {
            let convertToMillion = 1000000 * 1000000;
            let emissionUnit = '';
            let intensityUnit = 'g';
            let dataObject = [];
            let allDataArray = [];
            let maxCountArray = [];
            let targetLevel = [];
            const colors = ['#ffcb77', '#367c90', '#c1d3c0', '#d8856b', '#5f9a80', '#215154', '#ffcb77', '#367c90', '#c1d3c0', '#d8856b'];
            const lables = [...new Set(getRegionEmissions.map(item => item.year))];
            let regions = ['OTHER'];
            if (region_id) {
                regions = [...new Set(getRegionEmissions.map(item => AES.decrypt(item['Region.name'], SQLToken)))]
            }

            for (let i = 0; i < regions.length; i++) {
                let tempDataObject = {};
                let tempArray = [];
                for (const property of getRegionEmissions) {
                    let region_name_string = (property['Region.name']) ? AES.decrypt(property['Region.name'], SQLToken) : 'OTHER';
                    if (region_id) {
                        if (region_name_string == regions[i]) {
                            let data = Helper.roundToDecimal(property.emission / property.emission_per_ton);
                            if (toggel_data == 1) {
                                data = Helper.roundToDecimal(property.emission / convertToMillion);
                            }

                            tempArray.push(data);
                            if (tempDataObject["name"] === undefined) {
                                tempDataObject.name = region_name_string;
                            }
                            if (tempDataObject["year"] === undefined) {
                                tempDataObject.year = property.year;
                            }
                        }
                    } else {
                        let data = Helper.roundToDecimal(property.emission / property.emission_per_ton);
                        if (toggel_data == 1) {
                            data = Helper.roundToDecimal(property.emission / convertToMillion);
                        }

                        tempArray.push(data);
                        if (tempDataObject["name"] === undefined) {
                            tempDataObject.name = region_name_string;
                        }
                        if (tempDataObject["year"] === undefined) {
                            tempDataObject.year = property.year;
                        }
                    }

                }
                allDataArray.push(tempArray);
                tempDataObject.data = tempArray;
                tempDataObject.color = colors[i];
                dataObject.push(tempDataObject);
            }

            for (let i in allDataArray) {

                for (let j = 0; j < allDataArray[i].length; j++) {
                    if (maxCountArray[j] === undefined) {
                        maxCountArray[j] = allDataArray[i][j];
                    } else {
                        maxCountArray[j] += allDataArray[i][j];
                    }
                }
            }

            for (let i in maxCountArray) {
                targetLevel.push(Helper.roundToDecimal(maxCountArray[i] - (maxCountArray[i] * (20 / 100))));
            }

            let base = Math.max(...maxCountArray);
            let baseLine = Helper.roundToDecimal(base + (base * (15 / 100)));

            dataObject.push({
                name: 'company_level',
                data: maxCountArray,
            });
            dataObject.push({
                name: 'target_level',
                data: targetLevel,
            });
            dataObject.push({
                name: 'base_level',
                data: baseLine,
            });

            dataObject.push({
                name: 'Max',
                data: Helper.roundToDecimal(baseLine + (baseLine * (10 / 100))),
            });

            if (toggel_data == 1) {
                dataObject.push({
                    name: 'Unit',
                    data: emissionUnit,
                });
            } else {
                dataObject.push({
                    name: 'Unit',
                    data: intensityUnit,
                });
            }

            dataObject.push({
                name: 'lables',
                data: lables,
            });


            return Response.customSuccessResponseWithData(res, 'Region Emissions', dataObject, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);

    }
}


/**
 * @description API to get region table data.
 * @exception Target level is static as of now because of no info avialble.
 * @param {region_id, year, quarter, col_name, order_by} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getRegionTableData = async (req, res) => {
    try {
        let { region_id, year, quarter, col_name, order_by } = req.body;
        const where = {}
        if (region_id || year || quarter) {
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
        }
        let getRegionTableData = await req.db.SummerisedEmission.findAll({
            attributes: ['id', [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'], [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'emission'],
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'total_ton_miles'],
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'cost'],
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")) )'), 'shipments'],
                'quarter'],
            where: where,
            include: [
                {
                    model: req.db.Region,
                    attributes: ['name'],
                }],
            group: ['region_id'],
            order: [[col_name ? col_name : "intensity", order_by ? order_by : "desc"]],

            raw: true
        });
        //check password is matched or not then exec
        if (getRegionTableData) {
            let c = 0;
            let convertToMillion = 1000000;
            let totalIntensity = [];
            let totalEmission = [];
            //NEW CODE
            for (const property of getRegionTableData) {
                let data = property.intensity;
                let data2 = property.emission / convertToMillion;
                totalIntensity.push(data);
                totalEmission.push(data2);
            }

            const averageIntensity = totalIntensity.reduce((a, b) => a + b, 0) / totalIntensity.length;
            const averageEmission = totalEmission.reduce((a, b) => a + b, 0) / totalEmission.length;
            for (const property of getRegionTableData) {
                property['Region.name'] = (property['Region.name']) ? AES.decrypt(property['Region.name'], SQLToken) : null;
                property['User.name'] = (property['User.name']) ? AES.decrypt(property['User.name'], SQLToken) : null;
                let intensity = Helper.roundToDecimal(property.intensity);
                let cost = Helper.roundToDecimal(property.cost / convertToMillion);

                property['intensity'] = (intensity < averageIntensity) ? { value: intensity, color: '#215254' } : { value: intensity, color: '#d8856b' };
                property['cost'] = (cost <= averageEmission) ? { value: cost, color: '#215254' } : { value: cost, color: '#d8856b' };
                c++;
            }
            console.log('getRegionTableData', getRegionTableData);
            return Response.customSuccessResponseWithData(res, 'Get Region Table Data', getRegionTableData, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get region emission graph data.
 * @exception Summerised Emission table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getRegionEmissionData = async (req, res) => {
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
                where[Op.and].push({ 'year': year })
            }
            if (quarter) {
                where[Op.and].push({ 'quarter': quarter })
            }
        }

        //NEW CODE
        let getRegionEmissions;
        if (toggel_data == 1) {
            getRegionEmissions = await req.db.SummerisedEmission.findAll({
                attributes: ['id', [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'], [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'emission']],
                where: where, include: [
                    {
                        model: req.db.Region,
                        attributes: ['name']
                    }],
                group: ['region_id'],
                order: [['emission', 'desc']],
                raw: true
            });
        } else {
            getRegionEmissions = await req.db.SummerisedEmission.findAll({
                attributes: ['id', [sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'], [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'emission']],
                where: where, include: [
                    {
                        model: req.db.Region,
                        attributes: ['name']
                    }],
                group: ['region_id'],
                order: [['intensity', 'desc']],
                raw: true
            });
        }

        if (getRegionEmissions) {
            let contributor = [];
            let detractor = [];
            let unit = 'g';
            let total = [];
            if (toggel_data == 1) {
                unit = 'tCo2e';
            }
            let convertToMillion = 1000000;
            //NEW CODE
            for (const property of getRegionEmissions) {
                let intensityData = property.intensity;
                if (toggel_data == 1) {
                    intensityData = property.emission / convertToMillion;
                }

                total.push(Helper.roundToDecimal(intensityData));
            }
            const average = (total.length > 0) ? Helper.roundToDecimal(total.reduce((a, b) => a + b, 0) / total.length) : 0;

            for (const property of getRegionEmissions) {

                let intensityData = Helper.roundToDecimal(property.intensity - average);
                let compareValue = property.intensity;
                if (toggel_data == 1) {
                    compareValue = property.emission / convertToMillion;
                    intensityData = Helper.roundToDecimal((property.emission / convertToMillion) - average);
                }
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property["Region.name"], SQLToken),
                        value: Math.abs(intensityData),
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property["Region.name"], SQLToken),
                        value: Math.abs(intensityData),
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
            return Response.customSuccessResponseWithData(res, 'Region Emissions', data, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }

    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get region Intensity by year.
 * @exception Summerised Emission table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, company_id, year, quarter} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getRegionIntensityByYear = async (req, res) => {
    try {
        let { region_id, company_id, year, quarter } = req.body;
        let current_year = parseInt(new Date().getFullYear() - 1);
        let past_year = new Date().getFullYear() - 2;
        const where = {}
        if (region_id || company_id || year || quarter) {
            where[Op.and] = []
            where[Op.or] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (company_id) {
                where[Op.and].push({
                    company_id: company_id
                })
            }

            if (year) {
                current_year = parseInt(year);
                past_year = year - 1;
                where[Op.or].push(sequelize.where(sequelize.literal('year'), past_year))
                where[Op.or].push(sequelize.where(sequelize.literal('year'), current_year))
            } else {
                where[Op.or].push(sequelize.where(sequelize.literal('year'), past_year))
                where[Op.or].push(sequelize.where(sequelize.literal('year'), current_year))
            }

            if (quarter) {
                where[Op.and].push(sequelize.where(sequelize.literal('quarter'), quarter))
            }
        } else {
            if (quarter) {
                where[Op.and] = []
                where[Op.and].push(sequelize.where(sequelize.literal('year'), current_year))
            }
        }

        let attributeArray = [];
        attributeArray = ['id',
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'total_ton_miles'],
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) )'), 'emission'],
             [sequelize.literal('quarter'), 'quarter'],
            [sequelize.literal('year'), 'year'],
        ];

        //OLD CODE START
        let getRegionEmissions = await req.db.SummerisedEmission.findAll({
            attributes: attributeArray,
            where: where,
           group: [ sequelize.literal('year')],
            order: [ sequelize.literal('year')],
            raw: true
        });

        console.log("getRegionEmissions", getRegionEmissions)
        //check password is matched or not then exec
        if (getRegionEmissions) {
            let data = [];
            let baseData = [];
            let maxYearValue = current_year;
            for (const property of getRegionEmissions) {
                let intensityData = Helper.roundToDecimal(property.emission / property.total_ton_miles);
                property.intensity = intensityData;
                baseData.push(intensityData);
            }
            let max = Math.max(...baseData);
            let baseLine = max * (20 / 100);
            data.push({
                dataset: getRegionEmissions,
                label: [past_year, current_year],
                industrialAverage: 85,
                baseLine: Helper.roundToDecimal(max + baseLine),
                max: Helper.roundToDecimal(max),
                graphMax: Helper.roundToDecimal((max + baseLine) + (max + baseLine) * (15 / 100))
            })
            return Response.customSuccessResponseWithData(res, 'Region Emissions', data, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get region intensity by quarter.
 * @param {region_id, company_id, year, quarter} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getRegionIntensityByQuarter = async (req, res) => {
    try {
        let { region_id, company_id, year, quarter } = req.body;
        let current_year = parseInt(new Date().getFullYear() - 1);
        let past_year = new Date().getFullYear() - 2;
        const where = {}
        if (region_id || company_id || year || quarter) {
            where[Op.and] = []
            where[Op.or] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (company_id) {
                where[Op.and].push({
                    company_id: company_id
                })
            }
            if (year) {
                current_year = parseInt(year);
                past_year = year - 1;
                where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), past_year))
                where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), current_year))
            } else {
                where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('year')), past_year))
                where[Op.or].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('year')), current_year))
            }

            if (quarter) {
                where[Op.and].push(sequelize.where(sequelize.fn('quarter', sequelize.col('date')), quarter))
            }
        } else {
            if (quarter) {
                where[Op.and] = []
                where[Op.and].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), current_year))
            }
        }

        let convertToMillion = 1000000;
        let attributeArray = [];
        if(quarter) {
            attributeArray = ['id', [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'emission_per_ton'],
            [sequelize.fn('date_format', sequelize.col(`Emission.date`), '%Y'), 'year'],
            [sequelize.fn('quarter', sequelize.col('date')), 'quarter']];
        } else {
            attributeArray = ['id', [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'emission_per_ton'],
            [sequelize.fn('date_format', sequelize.col(`Emission.date`), '%Y'), 'year'],
            [sequelize.literal(' "YTD" '), 'quarter']];
        }
        

        let getRegionEmissions = await req.db.Emission.findAll({
            attributes: attributeArray,
            where: where, include: [
                {
                    model: req.db.Region,
                    attributes: ['name']
                }],
            group: [sequelize.fn('YEAR', sequelize.col('date'))],
            order: [sequelize.fn('YEAR', sequelize.col('date'))],
            raw: true
        });


        //check password is matched or not then exec
        if (getRegionEmissions) {
            let data = [];
            let baseData = [];
            for (const property of getRegionEmissions) {
                property['Region.name'] = (property['Region.name']) ? AES.decrypt(property['Region.name'], SQLToken) : null;
                let intensityData = Helper.roundToDecimal(property.emission / convertToMillion);
                property.contributor = intensityData;
                baseData.push(intensityData);
            }
            let min = Math.min(...baseData);
            let max = Math.max(...baseData);
            let baseLine = max * (15 / 100);
            let maxY = max * (25 / 100);
            data.push({
                dataset: getRegionEmissions,
                label: [quarter - 1, parseInt(quarter)],
                year: [current_year],
                industrialAverage: 85,
                max: Helper.roundToDecimal(max + maxY),
                min: Helper.roundToDecimal(min),
                baseLine: Helper.roundToDecimal(max + baseLine),
                percent: 4
            })
            return Response.customSuccessResponseWithData(res, 'Region Emissions Quarterly', data, 200)
        } else { return Response.errorRespose(res, 'No Record Found!'); }

    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get region emission reduction graph values.
 * @exception Summerised Emission table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * Target level is static as of now because of no data avialble.
 * @param {region_id, year} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getRegionEmissionReduction = async (req, res) => {
    try {
        let { region_id, year , toggel_data} = req.body;
        let current_year = parseInt(new Date().getFullYear() - 1);
        let next_year = current_year + 1;
        const where = {}
        if (region_id || year) {
            where[Op.and] = []
            where[Op.or] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                current_year = parseInt(year);
                next_year = parseInt(year) + 1;
                where[Op.or].push(sequelize.where(sequelize.literal('year'), current_year))
                where[Op.or].push(sequelize.where(sequelize.literal('year'), next_year))
            }
        }

        let attributeArray = [
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / 1000000)'), 'intensity'],
            [sequelize.literal('quarter'), 'quarter'],
            [sequelize.literal('year'), 'year'],
        ];
        if(toggel_data == 1){
            attributeArray = [
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")))'), 'intensity'],
                [sequelize.literal('quarter'), 'quarter'],
                [sequelize.literal('year'), 'year'],
            ];
        }

        let getRegionEmissionsReduction = await req.db.SummerisedEmission.findAll({
            attributes: attributeArray,
            where: where,
            group: [sequelize.literal('year'), sequelize.literal('quarter')],
            order: [sequelize.literal('year'), sequelize.literal('quarter')]
        });

        //check password is matched or not then exec
        if (getRegionEmissionsReduction) {
            let company_level = [];
            let targer_level = [];
            let max_array = [];
            let base_level = [];
            let intialCompanyLevel;
            let last_intensity = [];
            let last_target = [];

            for (const property of getRegionEmissionsReduction) {
                company_level.push(Helper.roundToDecimal(property.dataValues.intensity));
                if (intialCompanyLevel == undefined) {
                    intialCompanyLevel = property.dataValues.intensity;
                }
                intialCompanyLevel = Helper.roundToDecimal((intialCompanyLevel - (intialCompanyLevel * 40 / 100)));
                targer_level.push(intialCompanyLevel);
                max_array.push(property.dataValues.intensity);
                last_intensity = property.dataValues.intensity;
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
            return Response.customSuccessResponseWithData(res, 'Emissions Reduction', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res, 'Error', error, 500);
    }
}

/**
 * @description API to get region emission reduction graph for particular rigion.
 * @exception Summerised Emission table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * Target level is static as of now because of no data avialble.
 * @param {region_id, year} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getRegionEmissionReductionRegion = async (req, res) => {
    try {
        let { region_id, year, toggel_data} = req.body;
        let current_year = parseInt(new Date().getFullYear() - 1);
        let next_year = current_year + 1;
        const whereRegion = {}
        const where = {}
        if (region_id || year) {
            whereRegion[Op.and] = []
            where[Op.and] = []
            where[Op.or] = []
            whereRegion[Op.or] = []
            if (region_id) {
                whereRegion[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                current_year = parseInt(year);
                next_year = parseInt(year) + 1;
                where[Op.or].push({ 'year': current_year })
                whereRegion[Op.or].push({ 'year': current_year })
                where[Op.or].push({ 'year': next_year })
                whereRegion[Op.or].push({ 'year': next_year })

            }
        }


        let attributeArray = [
            [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / 1000000)'), 'intensity'],
            [sequelize.literal('quarter'), 'quarter'],
            [sequelize.literal('year'), 'year']
        ];
        if(toggel_data == 1){
            attributeArray = [
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emissions),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")))'), 'intensity'],
                [sequelize.literal('quarter'), 'quarter'],
                [sequelize.literal('year'), 'year'],
            ];
        }
        let getRegionEmissionsReduction = await req.db.SummerisedEmission.findAll({
            attributes: attributeArray,
            where: where,
            group: [sequelize.literal('year'), sequelize.literal('quarter')],
            order: [sequelize.literal('year'), sequelize.literal('quarter')]
        });

        let regionEmissionsReduction = await req.db.SummerisedEmission.findAll({
            attributes: attributeArray,
            where: whereRegion,
            group: [sequelize.literal('year'), sequelize.literal('quarter')],
            order: [sequelize.literal('year'), sequelize.literal('quarter')]
        });

        //check password is matched or not then exec
        if (getRegionEmissionsReduction) {
            let company_level = [];
            let targer_level = [];
            let max_array = [];
            let base_level = [];
            let last_intensity = [];
            let region_data = [];
            let last_target = [];
            let last_region_data = 0;
            let intialCompanyLevel;
            for (const property of getRegionEmissionsReduction) {
                company_level.push(Helper.roundToDecimal(property.dataValues.intensity));
            }


            for (const property of regionEmissionsReduction) {
                region_data.push(Helper.roundToDecimal(property.dataValues.intensity));
                if (intialCompanyLevel == undefined) {
                    intialCompanyLevel = property.dataValues.intensity;
                }
                intialCompanyLevel = Helper.roundToDecimal((intialCompanyLevel - (intialCompanyLevel * 10 / 100)));
                last_target = intialCompanyLevel;
                targer_level.push(intialCompanyLevel);
                last_region_data = property.dataValues.intensity;
                max_array.push(property.dataValues.intensity);
            }
            if (next_year == 2023) {
                for (let i = 1; i < 4; i++) {
                    last_intensity = Helper.roundToDecimal((last_intensity - (last_intensity * 7 / 100)));
                    company_level.push(last_intensity);
                    last_target = Helper.roundToDecimal((last_target - (last_target * 10 / 100)));
                    targer_level.push(last_target);
                    last_region_data = Helper.roundToDecimal((last_region_data - (last_region_data * 10 / 100)));
                    region_data.push(last_region_data);
                }
            }
            let max = Math.max(...max_array);
            let maxData = Helper.roundToDecimal(max + (max * 30 / 100));
            base_level.push(maxData);
            let data = {
                company_level: company_level,
                targer_level: targer_level,
                region_level: region_data,
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
