import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const BusRoute = sequelize.define(
  "bus_route",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
    },
    bus_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "buses",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    route_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "routes",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
  },
  {
    tableName: "bus_routes",
    timestamps: true,
    indexes: [
      {
        unique: true,
        fields: ["bus_id", "route_id"], // Prevent duplicate bus-route pairs
      },
      {
        fields: ["bus_id"],
      },
      {
        fields: ["route_id"],
      },
    ],
  }
);

export default BusRoute;
