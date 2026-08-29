-- DropForeignKey
ALTER TABLE `appointmentImage` DROP FOREIGN KEY `appointmentImage_appointmentId_fkey`;

-- DropForeignKey
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_client_Id_fkey`;

-- DropForeignKey
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_doctor_Id_fkey`;

-- DropForeignKey
ALTER TABLE `appointments` DROP FOREIGN KEY `appointments_procedure_Id_fkey`;

-- DropForeignKey
ALTER TABLE `appointments_notifications` DROP FOREIGN KEY `appointments_notifications_appointment_Id_fkey`;

-- DropForeignKey
ALTER TABLE `comments` DROP FOREIGN KEY `comments_appointment_Id_fkey`;

-- DropForeignKey
ALTER TABLE `procedures_contraindication` DROP FOREIGN KEY `procedures_contraindication_procedure_Id_fkey`;

-- DropForeignKey
ALTER TABLE `procedures_injection_zone` DROP FOREIGN KEY `procedures_injection_zone_procedure_Id_fkey`;

-- DropForeignKey
ALTER TABLE `procedures_preparetions` DROP FOREIGN KEY `procedures_preparetions_procedure_Id_fkey`;

-- DropForeignKey
ALTER TABLE `procedures_price` DROP FOREIGN KEY `procedures_price_procedure_Id_fkey`;

-- DropForeignKey
ALTER TABLE `procedures_rehabilitation` DROP FOREIGN KEY `procedures_rehabilitation_procedure_Id_fkey`;

-- DropForeignKey
ALTER TABLE `procedures_result` DROP FOREIGN KEY `procedures_result_procedure_Id_fkey`;

-- DropForeignKey
ALTER TABLE `visit_history` DROP FOREIGN KEY `visit_history_client_Id_fkey`;

-- DropIndex
DROP INDEX `comments_appointment_Id_fkey` ON `comments`;

-- AlterTable
ALTER TABLE `comments` DROP COLUMN `appointment_Id`;

-- DropTable
DROP TABLE `appointmentImage`;

-- DropTable
DROP TABLE `appointments`;

-- DropTable
DROP TABLE `appointments_notifications`;

-- DropTable
DROP TABLE `procedures`;

-- DropTable
DROP TABLE `procedures_contraindication`;

-- DropTable
DROP TABLE `procedures_injection_zone`;

-- DropTable
DROP TABLE `procedures_preparetions`;

-- DropTable
DROP TABLE `procedures_price`;

-- DropTable
DROP TABLE `procedures_rehabilitation`;

-- DropTable
DROP TABLE `procedures_result`;

-- DropTable
DROP TABLE `visit_history`;
