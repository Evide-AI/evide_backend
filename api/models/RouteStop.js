import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const RouteStop = sequelize.define(
  "route_stop",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    stop_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "stops",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    sequence_order: {
      type: DataTypes.INTEGER,
      allowNull: false,
      validate: {
        min: 1,
      },
    },
    travel_time_from_previous_stop_min: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    travel_distance_from_previous_stop: {
      type: DataTypes.DECIMAL(10, 2),
      allowNull: false,
      defaultValue: 0,
      validate: {
        min: 0,
      },
    },
    dwell_time_minutes: {
      type: DataTypes.INTEGER,
      allowNull: false,
      defaultValue: 1,
      validate: {
        min: 0,
      },
    },
  },
  {
    tableName: "route_stops",
    timestamps: false,
    indexes: [
      {
        fields: ["route_id"],
      },
      {
        fields: ["stop_id"],
      },
      {
        unique: true,
        fields: ["route_id", "stop_id"],
      },
      {
        fields: ["route_id", "sequence_order"],
      },
    ],
  }
);

export default RouteStop;
