#version 330
#line 1 1 // version.h.glsl
#ifndef INCLUDE_ONCE_EF4160B0_E881_42C8_BB48_A408AF2E4354
#define INCLUDE_ONCE_EF4160B0_E881_42C8_BB48_A408AF2E4354

#extension GL_ARB_shading_language_420pack : enable
#ifdef GL_ARB_shading_language_420pack
# define CONST const
#else
# define CONST
#endif

#endif
#line 3 0 // eclipsed-direct-irradiance.frag
#line 1 2 // const.h.glsl
#ifndef INCLUDE_ONCE_2B59AE86_E78B_4D75_ACDF_5DA644F8E9A3
#define INCLUDE_ONCE_2B59AE86_E78B_4D75_ACDF_5DA644F8E9A3
const float earthRadius=6.371e+06; // must be in meters
const float atmosphereHeight=120000; // must be in meters

const vec3 earthCenter=vec3(0,0,-earthRadius);

const float dobsonUnit = 2.687e20; // molecules/m^2
const float PI=3.1415926535897932;
const float km=1000;
#define sqr(x) ((x)*(x))

uniform float sunAngularRadius=0.00459925318;
const float moonRadius=1737100;
const vec4 scatteringTextureSize=vec4(128,8,32,32);
const vec2 irradianceTextureSize=vec2(64,16);
const vec2 transmittanceTextureSize=vec2(256,64);
const vec2 eclipsedSingleScatteringTextureSize=vec2(32,128);
const vec2 lightPollutionTextureSize=vec2(128,64);
const int radialIntegrationPoints=50;
const int angularIntegrationPoints=512;
const int lightPollutionAngularIntegrationPoints=200;
const int eclipseAngularIntegrationPoints=512;
const int numTransmittanceIntegrationPoints=500;
const vec4 scatteringCrossSection_molecules=vec4(2.89217878e-31,2.36756505e-31,1.95668875e-31,1.63119977e-31);
const vec4 scatteringCrossSection_aerosols=vec4(4.29679994e-14,4.29679994e-14,4.29679994e-14,4.29679994e-14);
const vec4 groundAlbedo=vec4(0.0700000003,0.057,0.0469999984,0.137999997);
const vec4 solarIrradianceAtTOA=vec4(1.72300005,1.60399997,1.51600003,1.40799999);
const vec4 lightPollutionRelativeRadiance=vec4(3.35000004e-05,1.33100002e-05,9.49999958e-06,4.30399996e-06);
const vec4 wavelengths=vec4(610.666687,642,673.333313,704.666687);
const int wlSetIndex=2;
#endif
#line 4 0 // eclipsed-direct-irradiance.frag
#line 1 3 // common-functions.h.glsl
#ifndef INCLUDE_ONCE_B0879E51_5608_481B_9832_C7D601BD6AB1
#define INCLUDE_ONCE_B0879E51_5608_481B_9832_C7D601BD6AB1
float distanceToAtmosphereBorder(const float cosZenithAngle, const float observerAltitude);
float distanceToNearestAtmosphereBoundary(const float cosZenithAngle, const float observerAltitude,
                                          const bool viewRayIntersectsGround);
float distanceToGround(const float cosZenithAngle, const float observerAltitude);
float cosZenithAngleOfHorizon(const float altitude);
bool rayIntersectsGround(const float cosViewZenithAngle, const float observerAltitude);
float safeSqrt(const float x);
float safeAtan(const float y, const float x);
float clampCosine(const float x);
float clampDistance(const float x);
float clampAltitude(const float altitude);
vec3 normalToEarth(vec3 point);
float pointAltitude(vec3 point);
vec4 rayleighPhaseFunction(float dotViewSun);
float sunVisibility(const float cosSunZenithAngle, float altitude);
float moonAngularRadius(const vec3 cameraPosition, const vec3 moonPosition);
float sunVisibilityDueToMoon(const vec3 camera, const vec3 sunDir, const vec3 moonDir);
vec3 sphereIntegrationSampleDir(const int index, const int pointCountOnSphere);
float sphereIntegrationSolidAngleDifferential(const int pointCountOnSphere);

void swap(inout float x, inout float y);

bool debugDataPresent();
vec4 debugData();
void setDebugData(float a);
void setDebugData(float a,float b);
void setDebugData(float a,float b,float c);
void setDebugData(float a,float b,float c,float d);
#endif
#line 5 0 // eclipsed-direct-irradiance.frag
#line 1 4 // direct-irradiance.h.glsl
#ifndef INCLUDE_ONCE_58AEF899_1A84_4A2F_AD71_4E7680B83E29
#define INCLUDE_ONCE_58AEF899_1A84_4A2F_AD71_4E7680B83E29

vec4 computeDirectGroundIrradiance(const float cosSunZenithAngle, const float altitude);

#endif
#line 6 0 // eclipsed-direct-irradiance.frag
#line 1 5 // texture-sampling-functions.h.glsl
#ifndef INCLUDE_ONCE_AF5AE9F4_8A9A_4521_838A_F8281B8FEB53
#define INCLUDE_ONCE_AF5AE9F4_8A9A_4521_838A_F8281B8FEB53
vec4 transmittanceToAtmosphereBorder(const float cosViewZenithAngle, const float altitude);
vec4 transmittance(const float cosViewZenithAngle, const float altitude, const float dist,
                   const bool viewRayIntersectsGround);
vec4 irradiance(const float cosSunZenithAngle, const float altitude);
vec4 scattering(const float cosSunZenithAngle, const float cosViewZenithAngle,
                const float dotViewSun, const float altitude, const bool viewRayIntersectsGround,
                const int scatteringOrder);
vec4 lightPollutionScattering(const float altitude, const float cosViewZenithAngle, const bool viewRayIntersectsGround);
#endif
#line 7 0 // eclipsed-direct-irradiance.frag

vec4 calcEclipsedDirectGroundIrradiance(const vec3 pointOnGround, const vec3 sunDir, const vec3 moonPos)
{
    CONST float altitude=0; // we are on the ground, after all
    CONST vec3 zenith=normalize(pointOnGround-earthCenter);
    CONST float cosSunZenithAngle=dot(sunDir,zenith);

    CONST float visibility=sunVisibilityDueToMoon(pointOnGround, sunDir, moonPos)
                                                    *
                      // FIXME: this ignores orientation of the crescent of eclipsed Sun WRT horizon
                                    sunVisibility(cosSunZenithAngle, altitude);

    return visibility * computeDirectGroundIrradiance(cosSunZenithAngle, altitude);
}

