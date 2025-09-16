import { DataTypes } from "sequelize"
import { sequelize } from "../../config/db.js"

const GpsData = sequelize.define(
  "GpsData",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bus_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    route_id: {
      type: DataTypes.UUID,
      allowNull: false,
    },
    latitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    longitude: {
      type: DataTypes.FLOAT,
      allowNull: false,
    },
    speed: {
      type: DataTypes.INTEGER,
      allowNull: true,
    },
    last_updated: {
      type: DataTypes.DATE,
      allowNull: false,
      defaultValue: DataTypes.NOW,
    },
  },
  {
    tableName: "gps_data",
    timestamps: false,
  },
)

export default GpsData
