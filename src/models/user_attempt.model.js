const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const UserAttempt = sequelize.define("user_attempt", {
  id: {
    type: DataTypes.INTEGER,
    primaryKey: true,
    autoIncrement: true,
  },
  email: {
    type: DataTypes.STRING,
    allowNull: false,
  },
  ipaddress: {
    type: DataTypes.STRING,
    allowNull: true,
  },
  timestamp: {
    type: DataTypes.DATE,
    allowNull: false,
    defaultValue: DataTypes.NOW,
  },
  success: {
    type: DataTypes.BOOLEAN,
    allowNull: false,
  },
});

module.exports = UserAttempt;
