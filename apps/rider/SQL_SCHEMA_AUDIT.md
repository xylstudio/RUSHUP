# SQL Schema Audit

Canonical schema file: schema-all-in-one.sql

This repository now treats schema-all-in-one.sql as the only SQL source of truth for active runtime features.

Included from active runtime usage:
- service/customer core: profiles, houses, services, orders, payments, notifications, job_assignments, work_reports, documents
- POS/LIFF: pos_orders, pos_order_items, pos_menu_items, pos_menu_categories, pos_menu_modifier_groups, pos_menu_modifiers, pos_item_modifier_links, pos_shop_settings, pos_members, pos_points_history, pos_qr_reward_tokens, saved_addresses, pos_attendance
- workshop: workshop_bookings, workshop_payments
- marketplace and plant library: marketplace_plants, document_item_catalog, plant_library_entries, plant_library_variants, v_plant_library_variants

Not merged into the canonical schema because runtime code does not currently depend on them:
- pos_riders and rider tracking helpers
- inventory audit helper tables
- destructive or one-off realtime reset scripts
- temporary check and repair SQL files

Tables removed after runtime/dependency audit:
- bookings
- inventory_waste
- pos_customers
- pos_promotions
- jobs
- pos_menu_recipes
- pos_modifier_recipes

Duplicate domains consolidated to a single active source:
- jobs -> job_assignments
- pos_menu_recipes + pos_modifier_recipes -> recipe_data on pos_menu_items and pos_menu_modifiers

Files retired after consolidation:
- every standalone .sql file outside schema-all-in-one.sql, including the three timestamped migration SQL files under migrations/