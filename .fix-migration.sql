-- Remove stuck failed migration from _prisma_migrations so new migrations can apply
DELETE FROM "_prisma_migrations" WHERE "migration_name" = '20260624100000_add_pixel_model';
