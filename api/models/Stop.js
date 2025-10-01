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
        len: {
          args: [2, 100],
          msg: "Stop name must be between 2 and 100 characters long",
        },
        notEmpty: {
          msg: "Stop name cannot be empty",
        },
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
