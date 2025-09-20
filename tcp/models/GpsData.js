import { DataTypes } from "sequelize"
import { sequelize } from "../../config/db.js"

// WGS84 - a coordinate system that uses latitude and longitude in degrees
// it's the standard
const COORDINATE_SYSTEM = 4326

const GpsData = sequelize.define(
  "GpsData",
  {
    id: {
      type: DataTypes.UUID,
      defaultValue: DataTypes.UUIDV4,
      primaryKey: true,
    },
    bus_id: {
      type: DataTypes.STRING,
      allowNull: false,
    },
    route_id: {
      type: DataTypes.UUID,
    },
    location: {
      type: DataTypes.GEOGRAPHY("POINT", COORDINATE_SYSTEM),
      allowNull: false,
    },
    speed: {
      type: DataTypes.INTEGER,
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
