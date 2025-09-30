/** @type {import('sequelize-cli').Migration} */
const migration = {
  async up(queryInterface, Sequelize) {
    // Enable PostGIS extension for geography support
    await queryInterface.sequelize.query(
      "CREATE EXTENSION IF NOT EXISTS postgis;",
    );

    // --- Create Tables ---

    await queryInterface.createTable("users", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      email: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      password: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      role: {
        type: Sequelize.STRING,
        allowNull: false,
        defaultValue: "user",
      },
      lastLogin: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable("buses", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      bus_number: {
        type: Sequelize.STRING,
        allowNull: false,
        unique: true,
      },
      imei_number: {
        type: Sequelize.STRING(15),
        allowNull: false,
        unique: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        defaultValue: true,
      },
      createdAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
      updatedAt: {
        allowNull: false,
        type: Sequelize.DATE,
      },
    });

    await queryInterface.createTable("routes", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      route_name: {
        type: Sequelize.STRING,
        allowNull: true,
      },
      total_distance_km: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: true,
      },
    });

    await queryInterface.createTable("stops", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      name: {
        type: Sequelize.STRING,
        allowNull: false,
      },
      location: {
        type: Sequelize.GEOGRAPHY("POINT", 4326),
        allowNull: false,
      },
    });

    await queryInterface.createTable("trips", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      route_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "routes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      bus_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "buses", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      scheduled_start_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      scheduled_end_time: {
        type: Sequelize.DATE,
        allowNull: false,
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
        defaultValue: true,
      },
      trip_type: {
        type: Sequelize.ENUM("regular", "express", "limited"),
        allowNull: false,
        defaultValue: "regular",
      },
    });

    await queryInterface.createTable("route_stops", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      route_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "routes", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      stop_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stops", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      sequence_order: {
        type: Sequelize.INTEGER,
        allowNull: false,
      },
      travel_time_from_previous_stop_min: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 0,
      },
      travel_distance_from_previous_stop: {
        type: Sequelize.DECIMAL(10, 2),
        allowNull: false,
        defaultValue: 0,
      },
      dwell_time_minutes: {
        type: Sequelize.INTEGER,
        allowNull: false,
        defaultValue: 1,
      },
    });

    await queryInterface.createTable("trip_stop_times", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      stop_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "stops", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      trip_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: { model: "trips", key: "id" },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      approx_arrival_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
      approx_departure_time: {
        type: Sequelize.DATE,
        allowNull: true,
      },
    });

    // --- Add All Indexes Defined in Models ---
    await queryInterface.addIndex("buses", ["bus_number"], { unique: true });
    await queryInterface.addIndex("buses", ["imei_number"], { unique: true });
    await queryInterface.addIndex("buses", ["is_active"]);

    await queryInterface.addIndex("routes", ["route_name"]);

    await queryInterface.addIndex("stops", ["name"]);
    await queryInterface.addIndex("trips", ["route_id"]);
    await queryInterface.addIndex("trips", ["bus_id"]);
    await queryInterface.addIndex("trips", ["scheduled_start_time"]);
    await queryInterface.addIndex("trips", ["is_active"]);

    await queryInterface.addIndex("route_stops", ["route_id"]);
    await queryInterface.addIndex("route_stops", ["stop_id"]);
    await queryInterface.addIndex("route_stops", ["route_id", "stop_id"], {
      unique: true,
    });
    await queryInterface.addIndex("route_stops", [
      "route_id",
      "sequence_order",
    ]);

    await queryInterface.addIndex("trip_stop_times", ["trip_id"]);
    await queryInterface.addIndex("trip_stop_times", ["stop_id"]);
    await queryInterface.addIndex("trip_stop_times", ["trip_id", "stop_id"], {
      unique: true,
    });
    await queryInterface.addIndex("trip_stop_times", ["approx_arrival_time"]);
  },

  async down(queryInterface, Sequelize) {
    // Drop tables in reverse order of creation
    await queryInterface.dropTable("trip_stop_times");
    await queryInterface.dropTable("route_stops");
    await queryInterface.dropTable("trips");
    await queryInterface.dropTable("stops");
    await queryInterface.dropTable("routes");
    await queryInterface.dropTable("buses");
    await queryInterface.dropTable("users");
  },
};

export default migration;
