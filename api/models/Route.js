import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Route = sequelize.define(
  "route",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    route_name: {
      type: DataTypes.STRING,
      allowNull: false,
      validate: {
        len: [2, 100],
      },
    },
    total_distance_km: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: true,
    },
  },
  {
    tableName: "routes",
    timestamps: false,
    indexes: [
      {
        fields: ["route_name"],
      },
    ],
  }
);

export default Route;
