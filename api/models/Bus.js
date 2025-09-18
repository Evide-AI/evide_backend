import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Bus = sequelize.define(
  "bus",
  {
    id: { type: DataTypes.INTEGER, primaryKey: true, autoIncrement: true },
    bus_number: {
      type: DataTypes.STRING,
      allowNull: false,
      unique: true,
      validate: { len: [4, 20] },
    },
    imei_number: {
      type: DataTypes.STRING(15),
      allowNull: false,
      unique: true,
      validate: { isNumeric: true },
    },
    name: { type: DataTypes.STRING, validate: { len: [2, 100] } },
    is_active: { type: DataTypes.BOOLEAN, defaultValue: true },
  },
  {
    tableName: "buses",
    timestamps: true,
    indexes: [
      { unique: true, fields: ["bus_number"] },
      { unique: true, fields: ["imei_number"] },
      { fields: ["is_active"] },
    ],
  }
);

export default Bus;
