const { DataTypes } = require("sequelize");
const sequelize = require("../config/db");

const AiUsage = sequelize.define(
  "ai_usage",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    user_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
    },
    ipaddress: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    usage_date: {
      type: DataTypes.DATEONLY,
      allowNull: false,
    },
    request_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    chat_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
    image_count: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
    },
  },
  {
    indexes: [
      {
        unique: true,
        fields: ["user_id", "ipaddress", "usage_date"],
      },
    ],
  }
);

module.exports = AiUsage;
