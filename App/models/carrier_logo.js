'use strict';
const {
  Model
} = require('sequelize');
module.exports = (sequelize, DataTypes) => {
  class CarrierLogo extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
    }
  }
  CarrierLogo.init({
    carrier_code: DataTypes.STRING,
    carrier_name: DataTypes.STRING,
    path:DataTypes.STRING,
  }, {
    sequelize,
    modelName: 'CarrierLogo',
    tableName:'carrier_logo'
  });
  CarrierLogo.associate = function(models) {
    CarrierLogo.belongsTo(models.EmissionLanes, {
      foreignKey: 'carrier_code',
      targetKey: 'carrier',
    });
  };
  return CarrierLogo;
};