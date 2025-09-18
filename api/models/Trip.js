import { DataTypes } from "sequelize";
import { sequelize } from "../../config/db.js";

const Trip = sequelize.define(
  "trip",
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
    scheduled_start_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    scheduled_end_time: {
      type: DataTypes.DATE,
      allowNull: false,
    },
    is_active: {
      type: DataTypes.BOOLEAN,
      allowNull: false,
      defaultValue: true,
    },
    trip_type: {
      type: DataTypes.ENUM("regular", "express", "limited"),
      allowNull: false,
      defaultValue: "regular",
    },
  },
  {
    tableName: "trips",
    timestamps: false,
    indexes: [
      {
        fields: ["route_id"],
      },
      {
        fields: ["bus_id"],
      },
      {
        fields: ["scheduled_start_time"],
      },
      {
        fields: ["is_active"],
      },
    ],
  }
);

export default Trip;
