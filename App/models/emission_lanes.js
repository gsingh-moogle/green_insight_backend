'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
class EmissionLanes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  EmissionLanes.init({
   
    name: DataTypes.STRING,
    emissions: DataTypes.FLOAT,
    total_ton_miles: DataTypes.FLOAT,
    carrier_name: DataTypes.STRING,
    carrier: DataTypes.STRING,
    quarter: DataTypes.STRING,
    shipments : DataTypes.STRING,
    year: DataTypes.STRING,
    region_id: DataTypes.INTEGER

  }, {
    sequelize,
    modelName: 'EmissionLanes',
    tableName:'emission_lanes'
  });

  EmissionLanes.associate = function(models) {
    EmissionLanes.hasOne(models.CarrierLogo, {
      foreignKey: 'carrier',
      targetKey: 'carrier_code',
    });
  };

  return EmissionLanes;
};