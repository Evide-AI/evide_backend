"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // 1. Change trips.scheduled_start_time from DATE to TIME
    await queryInterface.changeColumn("trips", "scheduled_start_time", {
      type: Sequelize.TIME,
      allowNull: false,
    });

    // 2. Change trips.scheduled_end_time from DATE to TIME
    await queryInterface.changeColumn("trips", "scheduled_end_time", {
      type: Sequelize.TIME,
      allowNull: false,
    });

    // 3. Change trip_stop_times.approx_arrival_time from DATE to TIME
    await queryInterface.changeColumn(
      "trip_stop_times",
      "approx_arrival_time",
      {
        type: Sequelize.TIME,
        allowNull: true,
      }
    );

    // 4. Change trip_stop_times.approx_departure_time from DATE to TIME
    await queryInterface.changeColumn(
      "trip_stop_times",
      "approx_departure_time",
      {
        type: Sequelize.TIME,
        allowNull: true,
      }
    );

    // 5. Create bus_routes junction table (missing from initial migration)
    await queryInterface.createTable("bus_routes", {
      id: {
        type: Sequelize.INTEGER,
        primaryKey: true,
        autoIncrement: true,
      },
      bus_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "buses",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      route_id: {
        type: Sequelize.INTEGER,
        allowNull: false,
        references: {
          model: "routes",
          key: "id",
        },
        onUpdate: "CASCADE",
        onDelete: "CASCADE",
      },
      is_active: {
        type: Sequelize.BOOLEAN,
        allowNull: false,
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

    // 6. Add indexes for bus_routes table
    await queryInterface.addIndex("bus_routes", ["bus_id", "route_id"], {
      unique: true,
      name: "bus_routes_unique_bus_route",
    });
    await queryInterface.addIndex("bus_routes", ["bus_id"], {
      name: "bus_routes_bus_id",
    });
    await queryInterface.addIndex("bus_routes", ["route_id"], {
      name: "bus_routes_route_id",
    });
  },

  async down(queryInterface, Sequelize) {
    // Reverse operations in opposite order

    // 6. Drop indexes from bus_routes
    await queryInterface.removeIndex("bus_routes", "bus_routes_route_id");
    await queryInterface.removeIndex("bus_routes", "bus_routes_bus_id");
    await queryInterface.removeIndex(
      "bus_routes",
      "bus_routes_unique_bus_route"
    );

    // 5. Drop bus_routes table
    await queryInterface.dropTable("bus_routes");

    // 4. Revert trip_stop_times.approx_departure_time back to DATE
    await queryInterface.changeColumn(
      "trip_stop_times",
      "approx_departure_time",
      {
        type: Sequelize.DATE,
        allowNull: true,
      }
    );

    // 3. Revert trip_stop_times.approx_arrival_time back to DATE
    await queryInterface.changeColumn(
      "trip_stop_times",
      "approx_arrival_time",
      {
        type: Sequelize.DATE,
        allowNull: true,
      }
    );

    // 2. Revert trips.scheduled_end_time back to DATE
    await queryInterface.changeColumn("trips", "scheduled_end_time", {
      type: Sequelize.DATE,
      allowNull: false,
    });

    // 1. Revert trips.scheduled_start_time back to DATE
    await queryInterface.changeColumn("trips", "scheduled_start_time", {
      type: Sequelize.DATE,
      allowNull: false,
    });
  },
};
