const sequelize = require('sequelize');
const Op = sequelize.Op;
const Helper = require("../helper/common-helper");
const Response = require("../helper/api-response");
const SQLToken = process.env.MY_SQL_TOKEN;
const AES = require('mysql-aes');

/**
 * @description API to get facilities emission data details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilietiesEmissionDataPagination = async (req, res) => {
    try {
        let { region_id, year, quarter, toggel_data} = req.body;
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
            attributes: ['id', ['name', 'lane_name'],
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"' + SQLToken + '")) )'), 'intensity'],
                [sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"' + SQLToken + '")) )'), 'emission'],
                [sequelize.literal('( SUM(AES_DECRYPT(UNHEX(shipments),"' + SQLToken + '")))'), 'shipment_count'],

            ],
            where: where,
            include:[
                {
                    model: req.db.Facility,
                    attributes: ['id','name', 'state'],
                }
            ],
            group: ['facilities_id'],
            order: [[order_by, 'asc']],
        });

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
                    attributes: ['id','name', 'state'],
                }
            ],
            group: ['facilities_id'],
            order: [[order_by, 'desc']],
        });

        //check password is matched or not then exec
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
            for (const property of getTopLaneEmissionData) {
                let difference = property.dataValues.intensity - average;
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    difference = (property.dataValues.emission / convertToMillion) - average;
                }
                console.log(property);
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.Facility.name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: Helper.roundToDecimal(property.dataValues.intensity),
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.Facility.name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#215154'
                    });
                }

                carrierArray.push(property.dataValues.lane_name)

            }

            for (const property of getButtomLaneEmissionData) {
                let difference = property.dataValues.intensity - average;
                console.log(property);
                let compareValue = property.dataValues.intensity;
                if (toggel_data == 1) {
                    compareValue = (property.dataValues.emission / convertToMillion);
                    difference = (property.dataValues.emission / convertToMillion) - average;
                }
                console.log('compareValueButtom', compareValue);
                if (compareValue > average) {
                    contributor.push({
                        name: AES.decrypt(property.Facility.name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
                        color: '#d8856b'
                    })
                } else {
                    detractor.push({
                        name: AES.decrypt(property.dataValues.Facility.name, SQLToken),
                        value: Math.abs(difference),
                        total_emission: property.dataValues.emission / convertToMillion,
                        total_intensity: property.dataValues.intensity,
                        shipment_count: property.dataValues.shipment_count,
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
                    whereCarrier[Op.and].push(sequelize.where(sequelize.fn('YEAR', sequelize.col('date')), year)
                    )
                }
                if (quarter) {
                   whereCarrier[Op.and].push(sequelize.where(sequelize.fn('quarter', sequelize.col('date')), quarter)
                    )
                }
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
 * @description API to get facility table data details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, col_name, order_by} req 
 * @param {*} res
 * @version V.1
 * @returns 
 */
exports.getFacilityTableData=async(req,res) => {
    try {
        let {region_id, year, quarter, col_name, order_by}=req.body;
        const where = {}
        if (region_id || year || quarter) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
             where[Op.and].push({'year':year})
            }
            if (quarter) {
              where[Op.and].push({'quarter':quarter})
            }
        }

        
       let getFacilityTableData = await req.db.SummerisedFacilities.findAll({
            attributes: ['id', [ sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"'+SQLToken+'")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"'+SQLToken+'")), 1) )'),'intensity'],[ sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"'+SQLToken+'")) )'),'emission'],
            [ sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(total_ton_miles),"'+SQLToken+'")) )'),'total_ton_miles'],
            [ sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(shipments),"'+SQLToken+'")) )'),'shipments'],
            'quarter'],
            where:where, 
            include: [
                {
                    model: req.db.Region,
                    attributes: ['name'],
                },{
                    model: req.db.Facility,
                    attributes: ['id','name', 'state'],
                }],
                group: ['facilities_id'],
                order: [[col_name ? col_name : "intensity", order_by ? order_by : "desc"  ]],
                raw:true
            });
        //check password is matched or not then exec
        if(getFacilityTableData){
            let c = 0;
            let convertToMillion  = 1000000;
            let totalIntensity = [];
            let totalEmission = [];
            //NEW CODE
            for (const property of getFacilityTableData) {
                let intensity = property.intensity;
                let data2 = property.emission/convertToMillion;
                totalIntensity.push(intensity);
                totalEmission.push(data2);
            }
            
            const averageIntensity = totalIntensity.reduce((a, b) => a + b, 0) / totalIntensity.length;
            const averageEmission = totalEmission.reduce((a, b) => a + b, 0) / totalEmission.length;
            
            for (const property of getFacilityTableData) {
                property['Region.name'] = (property['Region.name'])?AES.decrypt(property['Region.name'], SQLToken):null;
                property['Facility.name'] = (property['Facility.name'])?AES.decrypt(property['Facility.name'], SQLToken):null;
    
                let intensity = property.intensity;
                let emission = property.emission/convertToMillion;

               property['intensity'] = (intensity < averageIntensity)?{value:intensity,color:'#215254'}:{value:intensity,color:'#d8856b'};
            
                property['emission'] = (emission <= averageEmission)?{value:emission,color:'#215254'}:{value:emission,color:'#d8856b'};
              c++;
            }
            console.log('getFacilityTableData',getFacilityTableData);
            return Response.customSuccessResponseWithData(res,'Get Facility Table Data',getFacilityTableData,200)
        } else { return Response.errorRespose(res,'No Record Found!');}
    } catch (error) {
        
        console.log('____________________________________________________________error',error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
    }
}

/**
 * @description API to get facility emission details.
 * @exception Summerised Facilities table is used which is summerised version of emissions table(Prmiary table) to speed up the process of loading.
 * @param {region_id, year, quarter, toggel_data} req 
 * @param {*} res
 * @version V.1.2
 * @returns 
 */
exports.getFacilityEmissionData=async(req,res) => {
    try {
        let {region_id, year, quarter, toggel_data}=req.body;
      const where = {}
        if (region_id || year || quarter) {
            where[Op.and] = []
            if (region_id) {
                where[Op.and].push({
                    region_id: region_id
                })
            }
            if (year) {
                where[Op.and].push({'year':year})
            }
            if (quarter) {
                where[Op.and].push({'quarter':quarter})
            }
        }

            //NEW CODE
           let getFacilityEmissions;
            if(toggel_data == 1) {
                getFacilityEmissions = await req.db.SummerisedFacilities.findAll({
                    attributes: ['id',[ sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"'+SQLToken+'")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"'+SQLToken+'")), 1) )'),'intensity'],[ sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"'+SQLToken+'")) )'),'emission']],
                    where:where, 
                    include: [
                        {
                            model: req.db.Region,
                            attributes: ['name'],
                        },{
                            model: req.db.Facility,
                            attributes: ['id','name', 'state'],
                        }],
                    group: ['facilities_id'],
                    order:[['emission','desc']],
                    raw: true
                });
            } else {
                getFacilityEmissions = await req.db.SummerisedFacilities.findAll({
                    attributes: ['id',[ sequelize.literal('( SELECT ROUND(SUM(AES_DECRYPT(UNHEX(emission),"'+SQLToken+'")) / SUM(AES_DECRYPT(UNHEX(total_ton_miles),"'+SQLToken+'")), 1) )'),'intensity'],[ sequelize.literal('( SELECT SUM(AES_DECRYPT(UNHEX(emission),"'+SQLToken+'")) )'),'emission']],
                    where:where, 
                    include: [
                    {
                        model: req.db.Region,
                        attributes: ['name'],
                    },{
                        model: req.db.Facility,
                        attributes: ['id','name', 'state'],
                    }],
                    group: ['facilities_id'],
                    order:[['intensity','desc']],
                    raw: true
                });
            }
            
           if(getFacilityEmissions){
                let contributor = [];
                let detractor = [];
                let unit = 'g';
                let total = [];
                if(toggel_data == 1) {
                    unit = 'tCo2e';
                }
                let convertToMillion  = 1000000;
                //NEW CODE
                for (const property of getFacilityEmissions) {
                    let intensity = property.intensity;
                    if(toggel_data == 1) {
                        intensity = property.emission/convertToMillion;
                    }
                    
                    total.push(Helper.roundToDecimal(intensity));
                }
                console.log('total',total);
                const average = (total.length > 0)?Helper.roundToDecimal(total.reduce((a, b) => a + b, 0) / total.length):0;
                console.log('average',average)

                for (const property of getFacilityEmissions) {
                    let difference = Helper.roundToDecimal(property.intensity-average);
                    let compareValue = property.intensity;
                    if(toggel_data == 1) {
                        compareValue = property.emission/convertToMillion;
                        difference = Helper.roundToDecimal((property.emission/convertToMillion)-average);
                    }
                    if( compareValue > average) {
                        contributor.push({
                            name:AES.decrypt(property["Facility.name"], SQLToken),
                            value:Math.abs(difference),
                            color:'#d8856b'
                        })
                    } else {
                        detractor.push({
                            name:AES.decrypt(property["Facility.name"], SQLToken),
                            value:Math.abs(difference),
                            color:'#215154'
                        })
                    }
                }

                let contributorLenght = contributor.length;
                if(contributorLenght > 0){
                    contributor[contributorLenght-1]['color'] ='#efede9';
                }
                let detractorLenght = detractor.length;
                if(detractorLenght > 0){
                    detractor[0]['color'] ='#efede9';
                }

                const data = {
                    contributor:contributor,
                    detractor:detractor,
                    unit :unit,
                    average:Helper.roundToDecimal(average)
                };
               return Response.customSuccessResponseWithData(res,'Facility Emissions Data.',data,200)
            } else { return Response.errorRespose(res,'No Record Found!');}
        
    } catch (error) {
        
        console.log('____________________________________________________________error',error);
        return Response.customErrorResponseWithData(res,'Error',error,500);
    }
}