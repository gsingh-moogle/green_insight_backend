'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
class SummerisedFacilities extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  SummerisedFacilities.init({
    emission: DataTypes.STRING,
    total_ton_miles: DataTypes.STRING,
    shipments: DataTypes.STRING,
    facilities_id: DataTypes.INTEGER,
    region_id: DataTypes.INTEGER,
    quarter: DataTypes.STRING,
    year: DataTypes.STRING,
    origin: DataTypes.STRING,
    destination: DataTypes.STRING,
    name:DataTypes.STRING,
    carrier: DataTypes.STRING,
    carrier_name: DataTypes.STRING,
    carrier_logo:DataTypes.STRING
  }, {
    sequelize,
    modelName: 'SummerisedFacilities',
    tableName:'summerised_facilities'
  });

  SummerisedFacilities.associate = function(models) {
    SummerisedFacilities.belongsTo(models.Region, {
      foreignKey: 'region_id'
    });

    SummerisedFacilities.belongsTo(models.Facility, {
        foreignKey: 'facilities_id'
      });
  };

  return SummerisedFacilities;
};