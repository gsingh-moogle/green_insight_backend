'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
class SummerisedLanes extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SummerisedLanes.init({
   
    name: DataTypes.STRING,
    emissions: DataTypes.FLOAT,
    total_ton_miles: DataTypes.FLOAT,
    carrier_name: DataTypes.STRING,
    carrier: DataTypes.STRING,
    quarter: DataTypes.STRING,
    year: DataTypes.STRING,
    average: DataTypes.STRING,
    region_id: DataTypes.INTEGER

  }, {
    sequelize,
    modelName: 'SummerisedLanes',
    tableName:'summerised_lanes'
  });

  SummerisedLanes.associate = function(models) {
    SummerisedLanes.belongsTo(models.Region, {
      foreignKey: 'region_id'
    });
  };

  return SummerisedLanes;
};