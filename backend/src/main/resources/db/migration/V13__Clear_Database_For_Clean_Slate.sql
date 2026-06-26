SET FOREIGN_KEY_CHECKS = 0;

TRUNCATE TABLE military_units;
TRUNCATE TABLE military_unit_equipment;
TRUNCATE TABLE military_unit_capabilities;
TRUNCATE TABLE unit_route_history;
TRUNCATE TABLE unit_uav_assets;
TRUNCATE TABLE unit_history_events;
TRUNCATE TABLE soldiers;
TRUNCATE TABLE intelligence_reports;
TRUNCATE TABLE intelligence_report_keywords;
TRUNCATE TABLE osint_events;
TRUNCATE TABLE fire_missions;
TRUNCATE TABLE uav_missions;
TRUNCATE TABLE logistics_requests;
TRUNCATE TABLE q5_reports;
TRUNCATE TABLE artillery_pieces;
TRUNCATE TABLE artillery_ammo;
TRUNCATE TABLE forward_observers;
TRUNCATE TABLE operational_graphics;
TRUNCATE TABLE operations_orders;
TRUNCATE TABLE operations_order_recipient_user_ids;
TRUNCATE TABLE operations_order_acknowledgements;
TRUNCATE TABLE alerts;
TRUNCATE TABLE coa_plans;
TRUNCATE TABLE after_action_reports;
TRUNCATE TABLE report_links;

SET FOREIGN_KEY_CHECKS = 1;
