'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
class SummerisedCarrier extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SummerisedCarrier.init({
    region_id: DataTypes.INTEGER,
    emissions: DataTypes.FLOAT,
    total_ton_miles: DataTypes.FLOAT,
    shipments:DataTypes.STRING,
    carrier_name:DataTypes.STRING,
    carrier:DataTypes.STRING,
    data_strength: DataTypes.STRING,
    carrier_logo:DataTypes.STRING,
    quarter: DataTypes.FLOAT,
    year: DataTypes.FLOAT
  }, {
    sequelize,
    modelName: 'SummerisedCarrier',
    tableName:'summerised_carriers'
  });



  SummerisedCarrier.associate = function(models) {
    SummerisedCarrier.belongsTo(models.Region, {
      foreignKey: 'region_id'
    });
    SummerisedCarrier.hasOne(models.CarrierLogo, {
      foreignKey: 'carrier_code',
      targetKey: 'carrier'
    });
  };
  return SummerisedCarrier;
};