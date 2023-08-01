'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CarrierEmissions extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CarrierEmissions.init({

    name: DataTypes.STRING,
    emissions: DataTypes.FLOAT,
    total_ton_miles: DataTypes.FLOAT,
    carrier_name: DataTypes.STRING,
    carrier: DataTypes.STRING,
    quarter: DataTypes.STRING,
    shipments: DataTypes.STRING,
    year: DataTypes.STRING,
    region_id: DataTypes.INTEGER,
    carrier_logo: DataTypes.STRING,

  }, {
    sequelize,
    modelName: 'CarrierEmissions',
    tableName: 'carrier_emissions'
  });
  
  CarrierEmissions.associate = function(models) {
    CarrierEmissions.hasOne(models.CarrierLogo, {
      foreignKey: 'carrier',
      targetKey: 'carrier_code',
    });
  };

  return CarrierEmissions;
};