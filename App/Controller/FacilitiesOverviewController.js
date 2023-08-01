const sequelize = require('sequelize');
const Op = sequelize.Op;
const Helper = require("../helper/common-helper");
const Response = require("../helper/api-response");
const SQLToken = process.env.MY_SQL_TOKEN;
const AES = require('mysql-aes');

/**
 * @description API to get facility emission reduction graph details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilityEmissionReductionGraph=async(req,res) => {
    try {
       let {facility_id, year, toggel_data}=req.body;
        let current_year = parseInt(new Date().getFullYear()-1);
        let next_year = current_year+1;
           const whereFacility = {}
            const where = {}
            if (facility_id || year) {
                whereFacility[Op.and] = []
                where[Op.and] = []
                where[Op.or] = []
                whereFacility[Op.or] = []
                if (facility_id) {
                    whereFacility[Op.and].push({
                        facilities_id: facility_id
                    })
                }
                if (year) {
                    current_year = parseInt(year);
                    next_year = parseInt(year)+1;
                    where[Op.or].push({'year':current_year})
                    whereFacility[Op.or].push({'year':current_year})
                where[Op.or].push({'year':next_year})
                        whereFacility[Op.or].push({'year':next_year})
                
                }
            }
        
        let attributeArray = [ 
            [ sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"'+SQLToken+'")) / 1000000)'),'intensity'],
            [sequelize.literal('quarter'),'quarter'],
            [sequelize.literal('year'),'year']
        ];
        if(toggel_data == 1) {
            attributeArray = [ 
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")))'), 'intensity'],
                [sequelize.literal('quarter'),'quarter'],
                [sequelize.literal('year'),'year']
            ];
        }

        let getFacilityEmissionsReduction = await req.db.SummerisedFacilities.findAll({
            attributes :attributeArray,
            where:where,
            group: [sequelize.literal('year'),sequelize.literal('quarter') ],
            order: [sequelize.literal('year'),sequelize.literal('quarter')]
        });

        let facilityEmissionsReduction = await req.db.SummerisedFacilities.findAll({
            attributes :attributeArray,
            where:whereFacility,
            group: [sequelize.literal('year'),sequelize.literal('quarter') ],
            order: [sequelize.literal('year'),sequelize.literal('quarter')]
        });
        if(getFacilityEmissionsReduction){
            let company_level = [];
            let targer_level = [];
            let max_array = [];
            let base_level =[];
            let count = 0
            let last_intensity = [];
            let facility_data = [];
            let last_target = [];
            let last_region_data = 0;
            let intialCompanyLevel;
            for(const property of getFacilityEmissionsReduction) {
                company_level.push(Helper.roundToDecimal(property.dataValues.intensity));
                count++;
            }
            
            for(const property of facilityEmissionsReduction) {
                facility_data.push(Helper.roundToDecimal(property.dataValues.intensity));
                if(intialCompanyLevel == undefined){
                    intialCompanyLevel = property.dataValues.intensity;
                }
                intialCompanyLevel = Helper.roundToDecimal((intialCompanyLevel-(intialCompanyLevel*10/100)));
                last_target = intialCompanyLevel;
                targer_level.push(intialCompanyLevel);
                last_region_data = property.dataValues.intensity;
                max_array.push(property.dataValues.intensity);
            }
            if(next_year == 2023) {
                for (let i = 1; i < 4; i++) {
                    last_intensity = Helper.roundToDecimal((last_intensity-(last_intensity*7/100)));
                    company_level.push(last_intensity);
                    last_target = Helper.roundToDecimal((last_target-(last_target*10/100)));
                    targer_level.push(last_target);
                    last_region_data = Helper.roundToDecimal((last_region_data-(last_region_data*10/100)));
                    facility_data.push(last_region_data);
                }
            }
            let max = Math.max(...max_array);
            let maxData = Helper.roundToDecimal(max+(max*30/100));
            base_level.push(maxData);
            let data = {
                company_level : company_level,
                targer_level : targer_level,
                facility_level : facility_data,
                base_level: base_level,
                max : Helper.roundToDecimal(maxData+(maxData*20/100)),
                year : [current_year, next_year]
            }
            return Response.customSuccessResponseWithData(res,'Emissions Reduction',data,200)
        } else { return Response.errorRespose(res,'No Record Found!');}
    } catch (error) {
        console.log('____________________________________________________________error',error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
        
    }
}

/**
 * @description API to get facility comparison details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilityComparison = async (req, res) => {
    try {
    const { id } = req.params
    let getVendorEmissionData = await req.db.SummerisedFacilities.findOne(
        {
            attributes: ['id',
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/1000000))'), 'emissions'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
            ],
            where: {
                facilities_id: id
            },
            group: ['facilities_id'],
        }
    );
    let getTotalVendorEmissionData = await req.db.SummerisedFacilities.findOne(
        {
            attributes: ['id',
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity'],
                [sequelize.literal('( SELECT (SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/1000000))'), 'emissions'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
            ]
        }
    );

    let summerisedCarrierdata = await req.db.SummerisedFacilities.findOne(
        {
            attributes: [
                [sequelize.literal('( SELECT ROUND(sum(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")), 1) )'), 'intensity']
            ],
            include:[
                {
                    model: req.db.Facility,
                    attributes: ['name', 'state'],
                }
            ],
            where: {
                facilities_id: id}
        }
    );

    let baseLine = getTotalVendorEmissionData?.dataValues?.intensity * (20 / 100);

    console.log('summerisedCarrierdata.Facility.name',summerisedCarrierdata);
    const data = {
       
        responseData: {
            facility_name: (summerisedCarrierdata.Facility.name)?AES.decrypt(summerisedCarrierdata.Facility.name, SQLToken):null,
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

} catch (error) {
    console.log('____________________________________________________________error', error);
    return Response.customErrorResponseWithData(res,'Error',error,500);
}

}

/**
 * @description API to get facility overview details
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {facility_id, year, quarter} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilityOverviewDetails = async (req, res) => {
    try {
        let { facility_id, year, quarter} = req.body;

        const where = {}
        where[Op.and] = []
      if (facility_id || year || quarter) {
            if (facility_id) {
                where[Op.and].push({
                    facilities_id: facility_id
                })
            }
            if (year) {
                where[Op.and].push({'year':year})
           }
            if (quarter) {
                where[Op.and].push({'quarter':quarter})
           }
        }

    

       let getFacilityOverviewDetails = await req.db.SummerisedFacilities.findOne(
            {
                attributes: [
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000 )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                ],
                include:[
                    {
                        model: req.db.Facility,
                        attributes: ['id','name', 'state'],
                    }
                ],
                where: where
            });
       

        if (getFacilityOverviewDetails) {
            getFacilityOverviewDetails.Facility.name = AES.decrypt(getFacilityOverviewDetails.Facility.name, SQLToken);
            return Response.customSuccessResponseWithData(res, 'facility Overview Data', getFacilityOverviewDetails, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
    }
}

/**
 * @description API to get facility carrier comparison graph details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {facility_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilityCarrierComparisonGraph = async (req, res) => {
    try {
        let { facility_id, year, quarter, toggel_data} = req.body;

        const where = {}
       where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));
        if (facility_id || year || quarter) {
            if (facility_id) {
                where[Op.and].push({
                    facilities_id: facility_id
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
        let averageIntensity = await req.db.SummerisedFacilities.findOne(
            {
                attributes: [
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") / AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'average_intensity'],
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000)'), 'average_emission']
                ],
                where: where,
            }
        );

       let getTopCarrierEmissionData = await req.db.SummerisedFacilities.findAll(
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
                limit:10
            });
           
        let getButtomCarrierEmissionData = await req.db.SummerisedFacilities.findAll(
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
            const seen = new Set();
            let combinedData = [...getTopCarrierEmissionData, ...getButtomCarrierEmissionData];
            const filteredArr = combinedData.filter(el => {
                const duplicate = seen.has(el.carrier_name);
                seen.add(el.carrier_name);
                return !duplicate;
            });
            for (const property of filteredArr) {
                let differenceData =property.dataValues.intensity - average;
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    differenceData = (property.dataValues.emission / convertToMillion) - average;
                }

                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        value: Math.abs(differenceData),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity:property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.carrier_name, SQLToken),
                        value: Math.abs(differenceData),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity:property.dataValues.intensity,
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
            //detractor = detractor.reverse()
            let detractorLenght = detractor.length;
            if (detractorLenght > 0) {
                detractor[0]['color'] = '#efede9';
            }
            const data = {
                contributor: contributor,
                detractor: detractor,
                unit: unit,
                average: average
            };
            return Response.customSuccessResponseWithData(res, 'Carrier Emissions', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
    }
}

/**
 * @description API to get facility lane emission details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {facility_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilityLaneEmissionData = async (req, res) => {
    try {
        let { facility_id, year, quarter, toggel_data } = req.body;
        const where = {}
        where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));
        if (facility_id || year || quarter) {
           if (facility_id) {
                where[Op.and].push({
                    facilities_id: facility_id
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
        let averageIntensity = await req.db.SummerisedFacilities.findOne(
            {
                attributes: [
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") / AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'average_intensity'],
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000)'), 'average_emission']
                ],
                where: where,
            }
        );

        let getTopLaneEmissionData = await req.db.SummerisedFacilities.findAll(
            {
                attributes: ['id',['name', 'lane_name'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],

                ],
                include:[
                    {
                        model: req.db.Facility,
                        attributes: ['id','name'],
                    }
                ],
                where: where,
                group: ['lane_name'],
                order: [[order_by, 'asc']],
                limit :10
            }
            
        );

        let getButtomLaneEmissionData = await req.db.SummerisedFacilities.findAll(
            {
                attributes: ['id', ['name', 'lane_name'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                ],
                where: where,
                include:[
                    {
                        model: req.db.Facility,
                        attributes: ['id','name'],
                    }
                ],
                group: ['lane_name'],
                order: [[order_by, 'desc']],
                limit :10
            }
        );

        if (getTopLaneEmissionData) {
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
            let combinedData = [...getTopLaneEmissionData, ...getButtomLaneEmissionData];
            const filteredArr = combinedData.filter(el => {

                const duplicate = seen.has(el.dataValues.lane_name);
                seen.add(el.dataValues.lane_name);
                return !duplicate;
            });

            for (const property of filteredArr) {
                let difference = property.dataValues.intensity - average;
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    difference = (property.dataValues.emission / convertToMillion) - average;
                }
                console.log('compareValueTOP', compareValue);
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.dataValues.lane_name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.lane_name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#215154'
                    });
                }

            }

            // detractor = getTopLaneEmissionData;
            // contributor = getButtomLaneEmissionData;

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
                unit: unit,
                average: average
            };
            return Response.customSuccessResponseWithData(res, 'Lane Emissions', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
    }
}

/**
 * @description API to get facility inbound lane details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {facility_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilityInboundData = async (req, res) => {
    try {
        let { facility_id, year, quarter, toggel_data} = req.body;
        const where = {}
        where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));

        let facility_name = await req.db.Facility.findOne(
            {
                attributes: ['id','name'],
                where: {id :facility_id}
            }
        );
        if(!facility_name) {
            return Response.errorRespose(res, 'No Record Found!');
        }
        facility_name =  (facility_name.dataValues.name)?AES.decrypt(facility_name.dataValues.name, SQLToken).toUpperCase():null;

        if (facility_id || year || quarter || facility_name) {
           if (facility_id) {
                where[Op.and].push({
                    facilities_id: facility_id
                })
            }
            if (year) {
                where[Op.and].push({ 'YEAR': year });
            }
            if (quarter) {
                where[Op.and].push({ 'quarter': quarter });
            }

            if (facility_name) {
                where[Op.and].push(
                    sequelize.literal(`( AES_DECRYPT(UNHEX(destination),'${SQLToken}') LIKE '%${facility_name}%' )`)
                );
            }
        }

        let order_by = 'intensity';
        if (toggel_data == 1) {
          order_by = 'emission';
        }



        //NEW CODE
        let averageIntensity = await req.db.SummerisedFacilities.findOne(
            {
                attributes: [
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") / AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'average_intensity'],
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000)'), 'average_emission']
                ],
                where: where,
            }
        );
        let getTopLaneEmissionData = await req.db.SummerisedFacilities.findAll(
            {
                attributes: ['id',['name', 'lane_name'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],

                ],
                include:[
                    {
                        model: req.db.Facility,
                        attributes: ['id','name'],
                    }
                ],
                where: where,
                group: ['lane_name'],
                order: [[order_by, 'asc']],
                limit :10
            }
            
        );
        let getButtomLaneEmissionData = await req.db.SummerisedFacilities.findAll(
            {
                attributes: ['id', ['name', 'lane_name'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                ],
                where: where,
                include:[
                    {
                        model: req.db.Facility,
                        attributes: ['id','name'],
                    }
                ],
                group: ['lane_name'],
                order: [[order_by, 'desc']],
                limit :10
            }
        );

        if (getTopLaneEmissionData || getButtomLaneEmissionData) {
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
            let combinedData = [...getTopLaneEmissionData, ...getButtomLaneEmissionData];
            const filteredArr = combinedData.filter(el => {

                const duplicate = seen.has(el.dataValues.lane_name);
                seen.add(el.dataValues.lane_name);
                return !duplicate;
            });

            for (const property of filteredArr) {
                let difference = property.dataValues.intensity - average;
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    difference = (property.dataValues.emission / convertToMillion) - average;
                }
                console.log('compareValueTOP', compareValue);
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.dataValues.lane_name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.lane_name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#215154'
                    });
                }

            }
            // detractor = getTopLaneEmissionData;
            // contributor = getButtomLaneEmissionData;

            detractor = detractor.slice(0);
            detractor.sort(function(a,b) {
                return a.value - b.value;
            });
            contributor = contributor.slice(0);
            contributor.sort(function(a,b) {
                return b.value - a.value;
            });

            contributorLenght = contributor.length;
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
                average: average
            };
            return Response.customSuccessResponseWithData(res, 'Lane Emissions', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
    }
}

/**
 * @description API to get facility outbound lane details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {facility_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilityOutBoundData = async (req, res) => {
    try {
        let { facility_id, year, quarter, toggel_data } = req.body;
        const where = {}
        where[Op.and] = []
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") != 0 )'));
        where[Op.and].push(sequelize.literal('( AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '") != 0 )'));

        let facility_name = await req.db.Facility.findOne(
            {
                attributes: ['id','name'],
                where: {id :facility_id}
            }
        );
        if(!facility_name) {
            return Response.errorRespose(res, 'No Record Found!');
        }
        facility_name =  (facility_name.dataValues.name)?AES.decrypt(facility_name.dataValues.name, SQLToken).toUpperCase():null;
        console.log('facility_name',facility_name);
        if (facility_id || year || quarter || facility_name) {
           if (facility_id) {
                where[Op.and].push({
                    facilities_id: facility_id
                })
            }
            if (year) {
                where[Op.and].push({ 'YEAR': year });
            }
            if (quarter) {
                where[Op.and].push({ 'quarter': quarter });
            }

            if (facility_name) {
                where[Op.and].push(
                    sequelize.literal(`( AES_DECRYPT(UNHEX(origin),'${SQLToken}') LIKE '%${facility_name}%' )`)
                );
            }
        }

        let order_by = 'intensity';
        if (toggel_data == 1) {
           order_by = 'emission';
        }



        //NEW CODE
        let averageIntensity = await req.db.SummerisedFacilities.findOne(
            {
                attributes: [
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '") / AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'average_intensity'],
                    [sequelize.literal('( SELECT AVG(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '"))/ 1000000)'), 'average_emission']
                ],
                where: where,
            }
        );
        let getTopLaneEmissionData = await req.db.SummerisedFacilities.findAll(
            {
                attributes: ['id',['name', 'lane_name'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],

                ],
                include:[
                    {
                        model: req.db.Facility,
                        attributes: ['id','name'],
                    }
                ],
                where: where,
                group: ['lane_name'],
                order: [[order_by, 'asc']],
                limit :10
            }
            
        );
        let getButtomLaneEmissionData = await req.db.SummerisedFacilities.findAll(
            {
                attributes: ['id', ['name', 'lane_name'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                    [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                    [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],
                ],
                where: where,
                include:[
                    {
                        model: req.db.Facility,
                        attributes: ['id','name'],
                    }
                ],
                group: ['lane_name'],
                order: [[order_by, 'desc']],
                limit :10
            }
        );

        if (getTopLaneEmissionData || getButtomLaneEmissionData) {
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
            let combinedData = [...getTopLaneEmissionData, ...getButtomLaneEmissionData];
            console.log(combinedData.length);
            const filteredArr = combinedData.filter(el => {

                const duplicate = seen.has(el.dataValues.lane_name);
                seen.add(el.dataValues.lane_name);
                return !duplicate;
            });

            for (const property of filteredArr) {
                let difference = property.dataValues.intensity - average;
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    difference = (property.dataValues.emission / convertToMillion) - average;
                }
                console.log('compareValueTOP', compareValue);
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.dataValues.lane_name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.lane_name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#215154'
                    });
                }

            }
            // detractor = getTopLaneEmissionData;
            // contributor = getButtomLaneEmissionData;

            detractor = detractor.slice(0);
            detractor.sort(function(a,b) {
                return a.value - b.value;
            });
            contributor = contributor.slice(0);
            contributor.sort(function(a,b) {
                return b.value - a.value;
            });

            contributorLenght = contributor.length;

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
                average: average
            };
            return Response.customSuccessResponseWithData(res, 'Lane Emissions', data, 200);
        } else { return Response.errorRespose(res, 'No Record Found!'); }
    } catch (error) {
        console.log('____________________________________________________________error', error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
    }
}