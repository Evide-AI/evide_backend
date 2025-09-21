import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const TripStopTime = sequelize.define(
  "trip_stop_time",
  {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true,
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
    trip_id: {
      type: DataTypes.INTEGER,
      allowNull: false,
      references: {
        model: "trips",
        key: "id",
      },
      onUpdate: "CASCADE",
      onDelete: "CASCADE",
    },
    approx_arrival_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
    approx_departure_time: {
      type: DataTypes.DATE,
      allowNull: true,
    },
  },
  {
    tableName: "trip_stop_times",
    timestamps: false,
    indexes: [
      {
        fields: ["trip_id"],
      },
      {
        fields: ["stop_id"],
      },
      {
        unique: true,
        fields: ["trip_id", "stop_id"],
      },
      {
        fields: ["approx_arrival_time"],
      },
    ],
  }
);

export default TripStopTime;
