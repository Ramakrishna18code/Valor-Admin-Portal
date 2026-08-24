package com.valor.store;

import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import jakarta.annotation.PostConstruct;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.*;

@Service
public class RecordStore {
    private final JdbcTemplate jdbc;
    private final ObjectMapper mapper;
    private final PasswordEncoder encoder;

    public RecordStore(JdbcTemplate jdbc, ObjectMapper mapper, PasswordEncoder encoder) { this.jdbc = jdbc; this.mapper = mapper; this.encoder = encoder; }

    @PostConstruct
    void initialize() {
        jdbc.execute("create table if not exists valor_records (record_type varchar(80) not null, record_id bigint not null, payload varchar(100000) not null, primary key(record_type, record_id))");
        if (count("admins") == 0) seed(); if (count("roles") == 0) seedAdminExtras();
    }

    public long nextId(String type) { Long value = jdbc.queryForObject("select coalesce(max(record_id), 0) + 1 from valor_records where record_type = ?", Long.class, type); return value == null ? 1 : value; }
    public long count(String type) { Long value = jdbc.queryForObject("select count(*) from valor_records where record_type = ?", Long.class, type); return value == null ? 0 : value; }
    public List<Map<String,Object>> list(String type) { return jdbc.query("select payload from valor_records where record_type = ? order by record_id", (rs, n) -> parse(rs.getString(1)), type); }
    public Optional<Map<String,Object>> find(String type, long id) { List<Map<String,Object>> rows = jdbc.query("select payload from valor_records where record_type = ? and record_id = ?", (rs, n) -> parse(rs.getString(1)), type, id); return rows.stream().findFirst(); } public Optional<Map<String,Object>> findBy(String type, String field, String value) { return list(type).stream().filter(row -> value.equalsIgnoreCase(String.valueOf(row.getOrDefault(field, "")))).findFirst(); }
    public Map<String,Object> save(String type, long id, Map<String,Object> record) { try { String json = mapper.writeValueAsString(record); int updated = jdbc.update("update valor_records set payload = ? where record_type = ? and record_id = ?", json, type, id); if (updated == 0) jdbc.update("insert into valor_records(record_type, record_id, payload) values (?, ?, ?)", type, id, json); return record; } catch (Exception e) { throw new IllegalStateException("Could not save record", e); } }
    public void delete(String type, long id) { jdbc.update("delete from valor_records where record_type = ? and record_id = ?", type, id); }
    public boolean existsBy(String type, String field, String value) { return list(type).stream().anyMatch(row -> value.equalsIgnoreCase(String.valueOf(row.getOrDefault(field, "")))); }
    public List<Map<String,Object>> search(String type, String term) { String needle = term == null ? "" : term.toLowerCase(); return list(type).stream().filter(r -> r.toString().toLowerCase().contains(needle)).toList(); }
    private Map<String,Object> parse(String json) { try { return mapper.readValue(json, new TypeReference<>() {}); } catch (Exception e) { throw new IllegalStateException("Could not read record", e); } }
    private Map<String,Object> record(Object... values) { Map<String,Object> map = new LinkedHashMap<>(); for (int i=0;i<values.length;i+=2) map.put(String.valueOf(values[i]), values[i+1]); return map; }
    private void saveIfMissing(String type, long id, Map<String,Object> value) { if (find(type,id).isEmpty()) save(type,id,value); }
    private void seedAdminExtras() {
        saveIfMissing("roles",1,record("id",1,"name","SUPER_ADMIN","description","Full access to Valor operations","permissions","dashboard:read,operations:write,finance:write,inventory:write,admin:write,settings:write"));
        saveIfMissing("roles",2,record("id",2,"name","ADMIN","description","Operations and asset management access","permissions","dashboard:read,operations:write,finance:read,inventory:write"));
        saveIfMissing("settings",1,record("id",1,"companyName","Valor Lift Services","supportEmail","support@valor.com","supportPhone","+91 1800 123 456","timezone","Asia/Kolkata","defaultVisitDuration","90 minutes","maintenanceReminderDays","7","sessionTimeoutMinutes","60"));
        saveIfMissing("invoices",1,record("id",1,"invoiceNumber","INV-2841","customer","Apex Group","amount",48000,"tax",8640,"total",56640,"status","PAID","dueDate","2026-08-23"));
        saveIfMissing("invoices",2,record("id",2,"invoiceNumber","INV-2840","customer","Mehta Holdings","amount",18000,"tax",3240,"total",21240,"status","PARTIALLY_PAID","dueDate","2026-08-23"));
        saveIfMissing("transactions",1,record("id",1,"item","Door roller assembly","type","ISSUE","quantity",1,"reference","SR-10482","date","2026-08-24T09:00:00"));
        saveIfMissing("audit",1,record("id",1,"actor","Aditya Rao","action","ASSIGN_SERVICE_REQUEST","entity","SR-10482","timestamp","2026-08-24T09:10:00","status","SUCCESS"));
        saveIfMissing("audit",2,record("id",2,"actor","Neha Kapoor","action","UPDATE_INVENTORY","entity","DRA-204","timestamp","2026-08-24T08:45:00","status","SUCCESS"));
    }
    private void seed() {
        save("admins", 1, record("id",1,"name","Aditya Rao","email","admin@valor.com","phone","+91 98450 10001","password",encoder.encode("Admin@123"),"employeeId","ADM-001","designation","Operations Director","role","SUPER_ADMIN","active",true));
        save("admins", 2, record("id",2,"name","Neha Kapoor","email","ops@valor.com","phone","+91 98450 10002","password",encoder.encode("Admin@123"),"employeeId","ADM-002","designation","Operations Manager","role","ADMIN","active",true));
        save("customers", 1, record("id",1,"name","Apex Group","email","ops@apextowers.com","phone","+91 98450 12210","password",encoder.encode("Customer@123"),"role","CUSTOMER","enabled",true,"accountStatus","ACTIVE","city","Bengaluru"));
        save("customers", 2, record("id",2,"name","Mehta Holdings","email","admin@mehtaresidency.in","phone","+91 98800 45671","password",encoder.encode("Customer@123"),"role","CUSTOMER","enabled",true,"accountStatus","ACTIVE","city","Pune"));
        save("customers", 3, record("id",3,"name","Northstar Retail","email","facilities@northstarmall.com","phone","+91 99001 72839","password",encoder.encode("Customer@123"),"role","CUSTOMER","enabled",true,"accountStatus","ACTIVE","city","Hyderabad"));
        save("customers", 4, record("id",4,"name","Orchid Infra","email","helpdesk@orchidpark.in","phone","+91 98100 88219","password",encoder.encode("Customer@123"),"role","CUSTOMER","enabled",true,"accountStatus","ACTIVE","city","Mumbai"));
        save("technicians",1,record("id",1,"name","Arjun Rao","email","arjun@valor.com","phone","+91 98000 01001","password",encoder.encode("Tech@12345"),"employeeId","VLR-014","assignedArea","East Bengaluru","specialization","Passenger systems","currentWorkload",4,"pendingJobs",2,"rating",4.9,"role","TECHNICIAN","availabilityStatus","BUSY"));
        save("technicians",2,record("id",2,"name","Priya Shah","email","priya@valor.com","phone","+91 98000 01002","password",encoder.encode("Tech@12345"),"employeeId","VLR-022","assignedArea","Central Bengaluru","specialization","Controls & drives","currentWorkload",2,"pendingJobs",1,"rating",4.8,"role","TECHNICIAN","availabilityStatus","AVAILABLE"));
        save("technicians",3,record("id",3,"name","Vikram Singh","email","vikram@valor.com","phone","+91 98000 01003","password",encoder.encode("Tech@12345"),"employeeId","VLR-031","assignedArea","North Bengaluru","specialization","Freight systems","currentWorkload",5,"pendingJobs",3,"rating",4.7,"role","TECHNICIAN","availabilityStatus","BUSY"));
        save("buildings",1,record("id",1,"customerId",1,"buildingName","Apex Towers","buildingType","Commercial","address","12 Residency Road","city","Bengaluru","state","Karnataka","pincode","560001","numberOfLifts",8,"emergencyContactName","Security Desk","emergencyContactPhone","+91 98450 12210","status","ACTIVE"));
        save("buildings",2,record("id",2,"customerId",2,"buildingName","Mehta Residency","buildingType","Residential","address","24 Park Street","city","Pune","state","Maharashtra","pincode","411001","numberOfLifts",3,"emergencyContactName","Society Office","emergencyContactPhone","+91 98800 45671","status","ACTIVE"));
        save("buildings",3,record("id",3,"customerId",3,"buildingName","Northstar Mall","buildingType","Retail","address","8 Jubilee Hills","city","Hyderabad","state","Telangana","pincode","500033","numberOfLifts",12,"emergencyContactName","Mall Control Room","emergencyContactPhone","+91 99001 72839","status","ACTIVE"));
        save("buildings",4,record("id",4,"customerId",4,"buildingName","Orchid Business Park","buildingType","Commercial","address","7 Link Road","city","Mumbai","state","Maharashtra","pincode","400052","numberOfLifts",16,"emergencyContactName","Facility Desk","emergencyContactPhone","+91 98100 88219","status","ACTIVE"));
        save("lifts",1,record("id",1,"customerId",1,"buildingId",1,"name","Tower A · Passenger","liftNumber","LT-204","model","MonoSpace","manufacturer","KONE","capacity",13,"floorCount",18,"serialNumber","KN-204-88","currentStatus","ACTIVE","amcStatus","ACTIVE","warrantyStatus","VALID","healthScore",94,"totalBreakdowns",1,"nextMaintenanceDate","2026-08-24","lastMaintenanceDate","2026-07-24","qrCode","QR-LT-204"));
        save("lifts",2,record("id",2,"customerId",2,"buildingId",2,"name","Main lobby · Passenger","liftNumber","LT-119","model","Gen2","manufacturer","Otis","capacity",10,"floorCount",12,"serialNumber","OT-119-12","currentStatus","ACTIVE","amcStatus","ACTIVE","warrantyStatus","VALID","healthScore",88,"totalBreakdowns",2,"nextMaintenanceDate","2026-08-27","lastMaintenanceDate","2026-07-27","qrCode","QR-LT-119"));
        save("lifts",3,record("id",3,"customerId",3,"buildingId",3,"name","Loading bay · Freight","liftNumber","LT-087","model","CargoPro","manufacturer","Schindler","capacity",20,"floorCount",6,"serialNumber","SC-087-06","currentStatus","MAINTENANCE","amcStatus","EXPIRED","warrantyStatus","EXPIRED","healthScore",64,"totalBreakdowns",7,"nextMaintenanceDate","2026-08-24","lastMaintenanceDate","2026-07-12","qrCode","QR-LT-087"));
        save("lifts",4,record("id",4,"customerId",4,"buildingId",4,"name","Tower 2 · Passenger","liftNumber","LT-332","model","NEXIEZ","manufacturer","Mitsubishi","capacity",13,"floorCount",20,"serialNumber","MI-332-20","currentStatus","ACTIVE","amcStatus","ACTIVE","warrantyStatus","VALID","healthScore",91,"totalBreakdowns",0,"nextMaintenanceDate","2026-08-29","lastMaintenanceDate","2026-07-29","qrCode","QR-LT-332"));
        save("amcs",1,record("id",1,"amcNumber","AMC-2026-041","liftId",1,"plan","Platinum","coverageDetails","Monthly inspection and breakdown support","startDate","2026-01-01","endDate","2026-12-31","status","ACTIVE","renewalDate","2026-12-01","renewalCount",0));
        save("amcs",2,record("id",2,"amcNumber","AMC-2026-039","liftId",2,"plan","Standard","coverageDetails","Quarterly inspection","startDate","2026-02-15","endDate","2027-02-14","status","ACTIVE","renewalDate","2027-01-15","renewalCount",0));
        save("amcs",3,record("id",3,"amcNumber","AMC-2025-118","liftId",3,"plan","Comprehensive","coverageDetails","Full breakdown support","startDate","2025-09-01","endDate","2026-08-31","status","EXPIRED","renewalDate","2026-08-01","renewalCount",1));
        save("amcs",4,record("id",4,"amcNumber","AMC-2026-027","liftId",4,"plan","Platinum","coverageDetails","Monthly inspection and breakdown support","startDate","2026-03-01","endDate","2027-02-28","status","ACTIVE","renewalDate","2027-02-01","renewalCount",0));
        save("service-requests",1,record("id",1,"serviceId","SR-10482","title","Door sensor calibration","description","Door sensor requires calibration","priority","HIGH","status","IN_PROGRESS","serviceType","BREAKDOWN","customerId",1,"liftId",1,"assignedTechnicianId",1,"serviceRequestedAt","2026-08-24T08:20:00","preferredVisitDate","2026-08-24","preferredTimeSlot","09:00 AM - 10:00 AM"));
        save("service-requests",2,record("id",2,"serviceId","SR-10481","title","Unusual vibration on descent","description","Customer reports unusual vibration","priority","MEDIUM","status","ASSIGNED","serviceType","INSPECTION","customerId",2,"liftId",2,"assignedTechnicianId",2,"serviceRequestedAt","2026-08-24T08:30:00","preferredVisitDate","2026-08-24","preferredTimeSlot","10:00 AM - 12:00 PM"));
        save("service-requests",3,record("id",3,"serviceId","SR-10480","title","Lift not responding on floor 3","description","Lift stopped responding on floor 3","priority","EMERGENCY","status","ON_THE_WAY","serviceType","EMERGENCY","customerId",3,"liftId",3,"assignedTechnicianId",3,"serviceRequestedAt","2026-08-24T09:10:00","preferredVisitDate","2026-08-24","preferredTimeSlot","ASAP"));
        save("service-requests",4,record("id",4,"serviceId","SR-10479","title","Preventive maintenance visit","description","Scheduled preventive maintenance","priority","LOW","status","PENDING","serviceType","ROUTINE_MAINTENANCE","customerId",4,"liftId",4,"serviceRequestedAt","2026-08-24T09:30:00","preferredVisitDate","2026-08-25","preferredTimeSlot","11:30 AM - 01:00 PM"));
        save("service-requests",5,record("id",5,"serviceId","SR-10478","title","Quarterly inspection","description","Quarterly safety inspection completed","priority","LOW","status","COMPLETED","serviceType","INSPECTION","customerId",1,"liftId",1,"assignedTechnicianId",2,"serviceRequestedAt","2026-08-23T09:30:00","preferredVisitDate","2026-08-23","completedAt","2026-08-23T12:00:00"));
        save("payments",1,record("id",1,"customerId",1,"amcId",1,"invoiceNumber","INV-2841","amount",48000,"gstAmount",8640,"totalAmount",56640,"paymentMode","BANK_TRANSFER","status","PAID","paymentDateTime","2026-08-23T16:00:00","receiptNumber","REC-2841"));
        save("payments",2,record("id",2,"customerId",2,"amcId",2,"invoiceNumber","INV-2840","amount",18000,"gstAmount",3240,"totalAmount",21240,"paymentMode","UPI","status","PARTIALLY_PAID","paymentDateTime","2026-08-23T15:00:00","receiptNumber","REC-2840"));
        save("payments",3,record("id",3,"customerId",3,"amcId",3,"invoiceNumber","INV-2837","amount",72000,"gstAmount",12960,"totalAmount",84960,"paymentMode","BANK_TRANSFER","status","PENDING"));
        save("inventory",1,record("id",1,"itemName","Door roller assembly","sku","DRA-204","stockQuantity",12,"reorderLevel",8,"unit","Units","location","Bengaluru Central"));
        save("inventory",2,record("id",2,"itemName","Landing door lock","sku","LDL-119","stockQuantity",4,"reorderLevel",6,"unit","Units","location","Bengaluru Central"));
        save("inventory",3,record("id",3,"itemName","Contactor 40A","sku","CTR-040","stockQuantity",0,"reorderLevel",5,"unit","Units","location","Hyderabad Hub"));
        save("inventory",4,record("id",4,"itemName","Guide shoe set","sku","GSS-332","stockQuantity",18,"reorderLevel",10,"unit","Sets","location","Mumbai Hub"));
        save("notifications",1,record("id",1,"recipientType","CUSTOMER","recipientId",1,"title","Service completed · SR-10478","message","Your service request has been completed.","channel","EMAIL","status","SENT","scheduledAt","2026-08-23T16:00:00","sentAt","2026-08-23T16:00:00"));
        save("notifications",2,record("id",2,"recipientType","TECHNICIAN","recipientId",2,"title","New assignment · SR-10481","message","You have a new service assignment.","channel","PUSH","status","READ","scheduledAt","2026-08-24T08:20:00","sentAt","2026-08-24T08:20:00","readAt","2026-08-24T08:30:00"));
        save("roles",1,record("id",1,"name","SUPER_ADMIN","description","Full access to Valor operations","permissions","dashboard:read,operations:write,finance:write,inventory:write,admin:write,settings:write"));
        save("roles",2,record("id",2,"name","ADMIN","description","Operations and asset management access","permissions","dashboard:read,operations:write,finance:read,inventory:write"));
        save("settings",1,record("id",1,"companyName","Valor Lift Services","supportEmail","support@valor.com","supportPhone","+91 1800 123 456","timezone","Asia/Kolkata","defaultVisitDuration","90 minutes","maintenanceReminderDays","7","sessionTimeoutMinutes","60"));
        save("invoices",1,record("id",1,"invoiceNumber","INV-2841","customer","Apex Group","amount",48000,"tax",8640,"total",56640,"status","PAID","dueDate","2026-08-23"));
        save("invoices",2,record("id",2,"invoiceNumber","INV-2840","customer","Mehta Holdings","amount",18000,"tax",3240,"total",21240,"status","PARTIALLY_PAID","dueDate","2026-08-23"));
        save("transactions",1,record("id",1,"item","Door roller assembly","type","ISSUE","quantity",1,"reference","SR-10482","date","2026-08-24T09:00:00"));
        save("audit",1,record("id",1,"actor","Aditya Rao","action","ASSIGN_SERVICE_REQUEST","entity","SR-10482","timestamp","2026-08-24T09:10:00","status","SUCCESS"));
        save("audit",2,record("id",2,"actor","Neha Kapoor","action","UPDATE_INVENTORY","entity","DRA-204","timestamp","2026-08-24T08:45:00","status","SUCCESS"));
    }
}
