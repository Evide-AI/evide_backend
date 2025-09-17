import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Bus = sequelize.define(
  "Bus",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bus_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    bus_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [4, 20],
      },
    },
    IMEI: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: {
        len: [15, 15], // IMEI is 15 digits
        isNumeric: true,
      },
    },
  },
  {
    tableName: "buses",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["bus_number"],
      },
      {
        unique: true,
        fields: ["IMEI"],
      },
    ],
  }
);

export default Bus;
