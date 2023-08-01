'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
class SummerisedEmission extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SummerisedEmission.init({
   
    region_id: DataTypes.INTEGER,
    emissions: DataTypes.FLOAT,
    total_ton_miles: DataTypes.FLOAT,
    status: DataTypes.BOOLEAN,
    quarter: DataTypes.STRING,
    year: DataTypes.STRING

  }, {
    sequelize,
    modelName: 'SummerisedEmission',
    tableName:'summerised_emissions'
  });

  SummerisedEmission.associate = function(models) {
    SummerisedEmission.belongsTo(models.Region, {
      foreignKey: 'region_id'
    });
  };

  return SummerisedEmission;
};