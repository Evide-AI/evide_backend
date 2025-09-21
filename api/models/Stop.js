import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Stop = sequelize.define(
  "stop",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    location: {
      type: DataTypes.GEOGRAPHY,
      allowNull: false,
    },
  },
  {
    tableName: "stops",
    timestamps: false,
    indexes: [
      {
        fields: ["name"],
      },
    ],
  }
);

export default Stop;
