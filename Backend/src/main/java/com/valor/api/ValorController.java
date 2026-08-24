package com.valor.api;

import com.valor.security.JwtService;
import com.valor.store.RecordStore;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.time.OffsetDateTime;
import java.util.*;
import java.util.function.Consumer;

@RestController
@RequestMapping("/api")
public class ValorController {
    private final RecordStore store; private final JwtService jwt; private final PasswordEncoder encoder;
    private static final Set<String> RESOURCES = Set.of("customers","buildings","lifts","amcs","service-requests","technicians","payments","inventory","notifications","admin","roles","settings","audit","invoices","transactions","exports","schedule");
    private static final Map<String,String> TYPES = Map.of("admin","admins");

    public ValorController(RecordStore store, JwtService jwt, PasswordEncoder encoder) { this.store=store; this.jwt=jwt; this.encoder=encoder; }

    @GetMapping("/admin/dashboard/service-jobs")
    public ApiResponse<Map<String,Object>> dashboard(Authentication auth) {
        requireAdmin(auth); List<Map<String,Object>> jobs=store.list("service-requests");
        Map<String,Object> data=new LinkedHashMap<>();
        data.put("totalJobsToday", jobs.size()); data.put("jobsScheduledTomorrow", jobs.stream().filter(j->"2026-08-25".equals(j.get("preferredVisitDate"))).count());
        data.put("completedJobs", jobs.stream().filter(j->"COMPLETED".equals(j.get("status"))).count()); data.put("pendingJobs", jobs.stream().filter(j->Set.of("PENDING","ASSIGNED","ACCEPTED").contains(j.get("status"))).count());
        data.put("emergencyJobs", jobs.stream().filter(j->"EMERGENCY".equals(j.get("priority")) && !"COMPLETED".equals(j.get("status"))).count());
        data.put("totalCustomers", store.count("customers")); data.put("totalTechnicians", store.count("technicians")); data.put("totalLifts", store.count("lifts")); data.put("totalAmcs", store.count("amcs"));
        data.put("todaysJobs", jobs); data.put("tomorrowJobs", jobs.stream().filter(j->"2026-08-25".equals(j.get("preferredVisitDate"))).toList()); data.put("pendingJobList", jobs.stream().filter(j->"PENDING".equals(j.get("status"))).toList()); data.put("emergencyJobList", jobs.stream().filter(j->"EMERGENCY".equals(j.get("priority"))).toList());
        return ApiResponse.ok(data,"Dashboard loaded");
    }

    @GetMapping("/reports/summary")
    public ApiResponse<Map<String,Object>> summary(Authentication auth) { requireAdmin(auth); Map<String,Object> data=new LinkedHashMap<>(); data.put("totalCustomers",store.count("customers")); data.put("totalLifts",store.count("lifts")); data.put("totalServiceRequests",store.count("service-requests")); data.put("pendingJobs",store.search("service-requests","PENDING").size()); data.put("completedJobs",store.search("service-requests","COMPLETED").size()); data.put("emergencyJobs",store.search("service-requests","EMERGENCY").size()); data.put("totalTechnicians",store.count("technicians")); data.put("totalAmcs",store.count("amcs")); data.put("totalInventoryItems",store.count("inventory")); data.put("lowStockItems",store.list("inventory").stream().filter(this::lowStock).count()); data.put("totalNotifications",store.count("notifications")); data.put("totalPayments",store.count("payments")); data.put("totalAttendanceRecords",0); return ApiResponse.ok(data,"Report summary loaded"); }

    @PostMapping("/admin/auth/login")
    public ApiResponse<Map<String,Object>> adminLogin(@RequestBody Map<String,Object> body) {
        String email=text(body,"email"), password=text(body,"password");
        Map<String,Object> admin=store.list("admins").stream().filter(a->email.equalsIgnoreCase(text(a,"email"))).findFirst().orElseThrow(()->unauthorized("Invalid email or password"));
        if (!Boolean.TRUE.equals(admin.get("active")) || !encoder.matches(password,text(admin,"password"))) throw unauthorized("Invalid email or password");
        return ApiResponse.ok(authData(admin, adminRole(admin)),"Admin login successful");
    }
    @GetMapping("/admin/auth/me")
    public ApiResponse<Map<String,Object>> adminMe(Authentication auth) { requireAdmin(auth); Map<String,Object> admin=store.list("admins").stream().filter(a->text(a,"email").equalsIgnoreCase(auth.getName())).findFirst().orElseGet(()->store.find("admins",Long.parseLong(auth.getName())).orElse(null)); if(admin==null) throw notFound("Admin account not found"); return ApiResponse.ok(safe(admin),"Session valid"); }

    @PostMapping("/auth/login")
    public ApiResponse<Map<String,Object>> customerLogin(@RequestBody Map<String,Object> body) { String email=text(body,"email"), password=text(body,"password"); Map<String,Object> customer=store.list("customers").stream().filter(a->email.equalsIgnoreCase(text(a,"email"))).findFirst().orElseThrow(()->unauthorized("Invalid email or password")); if (!Boolean.TRUE.equals(customer.get("enabled")) || !encoder.matches(password,text(customer,"password"))) throw unauthorized("Invalid email or password"); return ApiResponse.ok(authData(customer),"Login successful"); }

    @GetMapping("/auth/me")
    public ApiResponse<Map<String,Object>> me(Authentication auth) { if(auth==null) throw unauthorized("Session expired"); return ApiResponse.ok(Map.of("email",auth.getName(),"role",auth.getAuthorities().stream().findFirst().map(Object::toString).orElse("")),"Session valid"); }

    @GetMapping("/{resource}")
    public ApiResponse<List<Map<String,Object>>> list(@PathVariable String resource, @RequestParam(required=false) Long customerId, @RequestParam(required=false) String status, Authentication auth) { requireAdmin(auth); String type=type(resource); List<Map<String,Object>> rows=store.list(type); if(customerId!=null) rows=rows.stream().filter(r->String.valueOf(customerId).equals(String.valueOf(r.get("customerId")))).toList(); if(status!=null&&!status.isBlank()) rows=rows.stream().filter(r->status.equalsIgnoreCase(text(r,"status"))).toList(); return ApiResponse.ok(rows.stream().map(this::safe).toList(),resource+" loaded"); }

    @GetMapping("/{resource}/search")
    public ApiResponse<List<Map<String,Object>>> search(@PathVariable String resource, @RequestParam(defaultValue="") String term, Authentication auth) { requireAdmin(auth); return ApiResponse.ok(store.search(type(resource),term).stream().map(this::safe).toList(),"Search complete"); }

    @GetMapping("/{resource}/{id}")
    public ApiResponse<Map<String,Object>> get(@PathVariable String resource,@PathVariable long id,Authentication auth) { requireAdmin(auth); return ApiResponse.ok(safe(store.find(type(resource),id).orElseThrow(()->notFound("Record not found"))),"Record loaded"); }

    @PostMapping("/{resource}")
    public ApiResponse<Map<String,Object>> create(@PathVariable String resource,@RequestBody Map<String,Object> body,Authentication auth) { requireAdmin(auth); String type=type(resource); validate(resource,body); long id=store.nextId(type); Map<String,Object> record=new LinkedHashMap<>(body); record.put("id",id); defaults(resource,record); if(Set.of("admin","technicians").contains(resource)) record.put("password",encoder.encode(text(record,"password"))); store.save(type,id,record); return ApiResponse.created(safe(record),"Record created"); }

    @PutMapping("/{resource}/{id}")
    public ApiResponse<Map<String,Object>> update(@PathVariable String resource,@PathVariable long id,@RequestBody Map<String,Object> body,Authentication auth) { requireAdmin(auth); String type=type(resource); Map<String,Object> existing=new LinkedHashMap<>(store.find(type,id).orElseThrow(()->notFound("Record not found"))); body.forEach((key,value)->{if(!Set.of("password","id","createdAt","updatedAt").contains(key)) existing.put(key,value);}); if(body.containsKey("password")&&!text(body,"password").isBlank()) existing.put("password",encoder.encode(text(body,"password"))); existing.put("updatedAt",OffsetDateTime.now().toString()); store.save(type,id,existing); return ApiResponse.ok(safe(existing),"Record updated"); }

    @DeleteMapping("/{resource}/{id}")
    public ApiResponse<Void> delete(@PathVariable String resource,@PathVariable long id,Authentication auth) { requireAdmin(auth); if("admin".equals(resource)&&store.count("admins")<=1) throw new ResponseStatusException(HttpStatus.CONFLICT,"At least one admin account must remain"); if(store.find(type(resource),id).isEmpty()) throw notFound("Record not found"); store.delete(type(resource),id); return ApiResponse.ok(null,"Record deleted"); }

    @PutMapping("/service-requests/{id}/assign")
    public ApiResponse<Map<String,Object>> assign(@PathVariable long id,@RequestParam long technicianId,Authentication auth) { requireAdmin(auth); Map<String,Object> job=job(id); if(store.find("technicians",technicianId).isEmpty()) throw notFound("Technician not found"); job.put("assignedTechnicianId",technicianId); job.put("status","ASSIGNED"); store.save("service-requests",id,job); return ApiResponse.ok(safe(job),"Technician assigned"); }
    @PutMapping("/service-requests/{id}/start")
    public ApiResponse<Map<String,Object>> start(@PathVariable long id,Authentication auth) { requireAdmin(auth); Map<String,Object> job=job(id); job.put("status","IN_PROGRESS"); job.put("startedAt",OffsetDateTime.now().toString()); store.save("service-requests",id,job); return ApiResponse.ok(safe(job),"Service request started"); }
    @PutMapping("/service-requests/{id}/complete")
    public ApiResponse<Map<String,Object>> complete(@PathVariable long id,@RequestBody(required=false) Map<String,Object> body,Authentication auth) { requireAdmin(auth); Map<String,Object> job=job(id); if(body!=null) job.putAll(body); job.put("status","COMPLETED"); job.put("completedAt",OffsetDateTime.now().toString()); store.save("service-requests",id,job); return ApiResponse.ok(safe(job),"Service request completed"); }

    @PostMapping("/inventory/{id}/transactions")
    public ApiResponse<Map<String,Object>> inventoryTransaction(@PathVariable long id,@RequestBody Map<String,Object> body,Authentication auth) { requireAdmin(auth); int quantity=number(body,"quantity"); if(quantity<=0) throw bad("quantity must be positive"); Map<String,Object> item=store.find("inventory",id).orElseThrow(()->notFound("Inventory item not found")); String movement=text(body,"transactionType"); int stock=number(item,"stockQuantity"); item.put("stockQuantity",Set.of("PURCHASE","RETURN").contains(movement)?stock+quantity:Math.max(0,stock-quantity)); store.save("inventory",id,item); Map<String,Object> transaction=new LinkedHashMap<>(body); transaction.put("id",store.nextId("inventory-transactions")); transaction.put("inventoryId",id); transaction.put("transactionDateTime",OffsetDateTime.now().toString()); store.save("inventory-transactions",number(transaction,"id"),transaction); return ApiResponse.created(safe(transaction),"Inventory transaction recorded"); }
    @GetMapping("/inventory/{id}/transactions")
    public ApiResponse<List<Map<String,Object>>> inventoryTransactions(@PathVariable long id,Authentication auth) { requireAdmin(auth); return ApiResponse.ok(store.list("inventory-transactions").stream().filter(t->String.valueOf(id).equals(String.valueOf(t.get("inventoryId")))).map(this::safe).toList(),"Transactions loaded"); }
    @PutMapping("/notifications/{id}/sent") public ApiResponse<Map<String,Object>> sent(@PathVariable long id,Authentication auth){return notificationState(id,"SENT","sentAt",auth);}
    @PutMapping("/notifications/{id}/read") public ApiResponse<Map<String,Object>> read(@PathVariable long id,Authentication auth){return notificationState(id,"READ","readAt",auth);}
    @PutMapping("/amcs/{id}/renew") public ApiResponse<Map<String,Object>> renew(@PathVariable long id,@RequestBody Map<String,Object> body,Authentication auth){requireAdmin(auth);Map<String,Object> amc=store.find("amcs",id).map(LinkedHashMap::new).orElseThrow(()->notFound("AMC not found"));amc.putAll(body);amc.put("status","RENEWED");amc.put("renewalCount",number(amc,"renewalCount")+1);store.save("amcs",id,amc);return ApiResponse.ok(safe(amc),"AMC renewed");}

    @GetMapping("/inventory/low-stock") public ApiResponse<List<Map<String,Object>>> lowStock(Authentication auth){requireAdmin(auth);return ApiResponse.ok(store.list("inventory").stream().filter(this::lowStock).map(this::safe).toList(),"Low-stock items loaded");}
    @GetMapping("/buildings/{id}/lifts") public ApiResponse<List<Map<String,Object>>> buildingLifts(@PathVariable long id,Authentication auth){requireAdmin(auth);return ApiResponse.ok(store.list("lifts").stream().filter(l->String.valueOf(id).equals(String.valueOf(l.get("buildingId")))).map(this::safe).toList(),"Building lifts loaded");}
    @GetMapping("/customers/{id}/buildings") public ApiResponse<List<Map<String,Object>>> customerBuildings(@PathVariable long id,Authentication auth){requireAdmin(auth);return ApiResponse.ok(store.list("buildings").stream().filter(b->String.valueOf(id).equals(String.valueOf(b.get("customerId")))).map(this::safe).toList(),"Customer buildings loaded");}
    @GetMapping("/customers/{id}/service-requests") public ApiResponse<List<Map<String,Object>>> customerJobs(@PathVariable long id,Authentication auth){requireAdmin(auth);return ApiResponse.ok(store.list("service-requests").stream().filter(j->String.valueOf(id).equals(String.valueOf(j.get("customerId")))).map(this::safe).toList(),"Customer service history loaded");}

    private ApiResponse<Map<String,Object>> notificationState(long id,String state,String field,Authentication auth){requireAdmin(auth);Map<String,Object> item=store.find("notifications",id).map(LinkedHashMap::new).orElseThrow(()->notFound("Notification not found"));item.put("status",state);item.put(field,OffsetDateTime.now().toString());store.save("notifications",id,item);return ApiResponse.ok(safe(item),"Notification updated");}
    private Map<String,Object> authData(Map<String,Object> user) {
        return authData(user, text(user,"role"));
    }

    private Map<String,Object> authData(Map<String,Object> user, String role) {
        Map<String,Object> data=new LinkedHashMap<>();
        data.put("accessToken",jwt.create(text(user,"email"),role,text(user,"name")));
        data.put("refreshToken",null);
        data.put("tokenType","Bearer");
        data.put("role",role);
        data.put("email",user.get("email"));
        data.put("name",user.get("name"));
        return data;
    }

    private String adminRole(Map<String,Object> user) {
        String role=text(user,"role").trim().toUpperCase(Locale.ROOT).replaceFirst("^ROLE_","");
        return Set.of("ADMIN","SUPER_ADMIN").contains(role) ? role : "ADMIN";
    }
    private Map<String,Object> safe(Map<String,Object> record){Map<String,Object> copy=new LinkedHashMap<>(record);copy.remove("password");return copy;}
    private String type(String resource){if(!RESOURCES.contains(resource)) throw new ResponseStatusException(HttpStatus.NOT_FOUND,"Unknown resource"); return TYPES.getOrDefault(resource,resource);}
    private void requireAdmin(Authentication auth){if(auth==null||auth.getAuthorities().stream().noneMatch(a->Set.of("ROLE_ADMIN","ROLE_SUPER_ADMIN").contains(a.getAuthority()))) throw new ResponseStatusException(HttpStatus.FORBIDDEN,"Admin access required");}
    private Map<String,Object> job(long id){return store.find("service-requests",id).map(LinkedHashMap::new).orElseThrow(()->notFound("Service request not found"));}
    private boolean lowStock(Map<String,Object> row){return number(row,"stockQuantity")<=number(row,"reorderLevel");}
    private void validate(String resource,Map<String,Object> body){if("service-requests".equals(resource)){required(body,"title");required(body,"description");required(body,"customerId");required(body,"liftId");}if("technicians".equals(resource)){required(body,"name");required(body,"email");if(text(body,"password").length()<8)throw bad("password must be at least 8 characters");}if("inventory".equals(resource)){required(body,"itemName");required(body,"sku");}if("buildings".equals(resource)){required(body,"buildingName");required(body,"customerId");}if("lifts".equals(resource)){required(body,"name");required(body,"customerId");}if("amcs".equals(resource)){required(body,"plan");required(body,"liftId");}}
    private void defaults(String resource,Map<String,Object> row){if("service-requests".equals(resource)){row.putIfAbsent("serviceId","VAL-SRQ-"+String.format("%05d",number(row,"id")));row.putIfAbsent("status","PENDING");row.putIfAbsent("priority","MEDIUM");row.putIfAbsent("serviceRequestedAt",OffsetDateTime.now().toString());}if("technicians".equals(resource)){row.putIfAbsent("role","TECHNICIAN");row.putIfAbsent("currentWorkload",0);row.putIfAbsent("pendingJobs",0);row.putIfAbsent("availabilityStatus","AVAILABLE");}if("buildings".equals(resource)){row.putIfAbsent("numberOfLifts",0);row.putIfAbsent("status","ACTIVE");}if("lifts".equals(resource)){row.putIfAbsent("currentStatus","ACTIVE");row.putIfAbsent("amcStatus","NON_AMC");row.putIfAbsent("healthScore",100);}if("amcs".equals(resource)){row.putIfAbsent("amcNumber","AMC-"+UUID.randomUUID().toString().substring(0,8).toUpperCase());row.putIfAbsent("status","ACTIVE");row.putIfAbsent("renewalCount",0);}if("payments".equals(resource)){row.putIfAbsent("status","PENDING");row.putIfAbsent("totalAmount",number(row,"amount"));row.putIfAbsent("invoiceNumber","VAL-INV-"+UUID.randomUUID().toString().substring(0,8).toUpperCase());}if("inventory".equals(resource)){row.putIfAbsent("stockQuantity",0);row.putIfAbsent("reorderLevel",0);}}
    private void required(Map<String,Object> body,String key){if(body.get(key)==null||text(body,key).isBlank())throw bad(key+" is required");}
    private String text(Map<String,Object> row,String key){return String.valueOf(row.getOrDefault(key,""));}
    private int number(Map<String,Object> row,String key){try{return Integer.parseInt(String.valueOf(row.getOrDefault(key,0)));}catch(Exception e){return 0;}}
    private ResponseStatusException bad(String message){return new ResponseStatusException(HttpStatus.BAD_REQUEST,message);}
    private ResponseStatusException unauthorized(String message){return new ResponseStatusException(HttpStatus.UNAUTHORIZED,message);}
    private ResponseStatusException tooMany(String message){return new ResponseStatusException(HttpStatus.TOO_MANY_REQUESTS,message);}
    private ResponseStatusException notFound(String message){return new ResponseStatusException(HttpStatus.NOT_FOUND,message);}
}
