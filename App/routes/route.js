const express =require("express");
const router=express.Router();
const {validateAdmin} = require("../middleware/auth");
const GreenInsightController=require("../Controller/GreenInsightController");
const RegionController=require("../Controller/RegionController");
const UserController=require("../Controller/UserController");
const CompanyController=require("../Controller/CompanyController");
const FacilitiesController=require("../Controller/FacilitiesController");
const FacilitiesOverviewController=require("../Controller/FacilitiesOverviewController");
const VendorController=require("../Controller/VendorController");
const LaneController=require("../Controller/LaneController");
const ProjectController=require("../Controller/ProjectController");
const ProjectDetailController=require("../Controller/ProjectDetailController");
const DecarbController=require("../Controller/DecarbController");
const BlobController=require("../Controller/BlobContainerController");
const ByRegionController=require("../Controller/ByRegionController");
const LaneOverviewController=require("../Controller/LaneOverviewController");
const Validations=require("../helper/api-validator");
//Auth API's
router.post("/login",GreenInsightController.login);
router.post("/verify-otp",GreenInsightController.verifyOtp);

router.post("/blob/login",BlobController.login);
router.post("/blob/bucket/upload",BlobController.blobUpload);

router.use(validateAdmin);
// router.use(createConnection);
// Verify Otp


//Sus Dashboard
router.get("/get-regions",RegionController.getRegions);
// router.post("/get-region-emission-graph",RegionController.getRegionEmissions);
router.post("/get-region-emission-monthly",RegionController.getRegionEmissionsMonthly);
//2nd verssion
router.post("/get-region-emission-monthlyV2",RegionController.getRegionEmissionsMonthlyV2);
// router.post("/get-region-intensity",RegionController.getRegionIntensity);
router.post("/get-region-intensity-yearly",RegionController.getRegionIntensityByYear);
router.post("/get-region-intensity-quarterly",RegionController.getRegionIntensityByQuarter);

// Emission reduction
router.post("/get-region-emission-reduction",RegionController.getRegionEmissionReduction);
router.post("/get-region-reduction",RegionController.getRegionEmissionReductionRegion);


// Get User Profile
// router.get("/get-user-profile",UserController.getProfileDetails);
router.get("/user/profile",UserController.getProfileDetails);
router.put("/user/profile/update",UserController.updateUserDetails);
router.post("/user/profile/image",UserController.updateUserProfileImage);
router.patch("/user/profile/update/password",UserController.updateUserPassword);

router.post("/get-company-data",CompanyController.getCompanyData);

//By Region Overview API's
router.post("/get-region-table-data",RegionController.getRegionTableData);
router.post("/get-region-emission-data",RegionController.getRegionEmissionData);
router.post("/get-region-carrier-comparison-data",ByRegionController.getRegionCarrierComparisonGraph);
router.post("/get-region-overview-detail",VendorController.getLaneCarrierOverviewDetail);

//By Facilities API's
router.post("/get-facilities-table-data",FacilitiesController.getFacilityTableData);
router.post("/get-facilities-emission-data",FacilitiesController.getFacilityEmissionData);

// Facilities Overview
router.post("/get-facilities-reduction-graph",FacilitiesOverviewController.getFacilityEmissionReductionGraph);
router.post("/get-facilities-overview-detail",FacilitiesOverviewController.getFacilityOverviewDetails);
router.get("/get-facilities-comparison/:id",FacilitiesOverviewController.getFacilityComparison);
router.post("/get-facilities-carrier-graph",FacilitiesOverviewController.getFacilityCarrierComparisonGraph);
router.post("/get-facilities-lane-graph",FacilitiesOverviewController.getFacilityLaneEmissionData);
router.post("/get-facilities-inbound-lane-graph",FacilitiesOverviewController.getFacilityInboundData);
router.post("/get-facilities-outbound-lane-graph",FacilitiesOverviewController.getFacilityOutBoundData);

//By Vendor API's
router.post("/get-vendor-table-data",VendorController.getVendorTableData);
router.post("/get-vendor-emission-data",VendorController.getVendorEmissionData);
router.get("/get-carrier-overview/:id",VendorController.getVendorCarrierOverview);
router.post("/get-lane-breakdown",VendorController.getLaneBreakdown);
router.get("/get-lane-carrier",VendorController.getLaneCarrierName);
router.post("/get-vendor-comparison",VendorController.getVendorEmissionComparison);

//By Lane API's
router.post("/get-lane-table-data-hight-intensity",LaneController.getLaneTableDataHighIntensity);
router.post("/get-lane-table-data-low-intensity",LaneController.getLaneTableDataLowIntensity);
router.post("/get-lane-emission-data",LaneController.getLaneEmissionData);
router.post("/get-lane-emission/pagination",LaneController.getLaneEmissionDataPagination);
router.post("/get-lane-carrier-table-data",LaneController.getLaneCarrierTableData);

//By Lane Overview API's
router.post("/get-lane-overview-details",LaneOverviewController.getLaneOverviewDetails);
router.post("/get-lane-reduction-graph",LaneOverviewController.getLaneReductionGraph);
router.post("/get-lane-carrier-graph",LaneOverviewController.getLaneCarrierComparisonGraph);

//Project API's
router.post("/get-project-count",ProjectController.getProjectCount);
router.post("/save-project",Validations.projectRegisterValidator(),ProjectController.saveProject);
router.post("/save-project-rating",Validations.projectRatingValidator(),ProjectController.saveProjectRating);
router.post("/get-project-list",ProjectController.getProjectList);
router.get("/get-project-search-list",ProjectController.getProjectSearchList);
router.delete("/delete-project",ProjectController.deleteProject);

//Project Detaisl API's
router.get("/get-project-detail/:id",ProjectDetailController.getProjectDetails);

// Decarb API's
router.post("/get-recommended-levers",DecarbController.getRecommendedLevers);
router.post("/get-customize-levers",DecarbController.getCustomizeLevers);

// Filter API's
router.get("/graph/filters/dates",GreenInsightController.getFilterDates);

//Insert Into decarb recommendation
router.get("/test/insert/decarb/recommendation",DecarbController.insertIntoDecarbRecommdation);

module.exports=router;