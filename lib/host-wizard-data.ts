import type { AmenityGroup, WizardOption, WizardStepDefinition } from "@/lib/host-wizard-types";

export const hostWizardSteps: WizardStepDefinition[] = [
  { id: "address", title: "Set up your StayPrimePH listing", description: "It’s easy to create a great listing—let’s start with your address." },
  { id: "place-intro", eyebrow: "Step 1", title: "Tell us about your place", description: "We’ll ask what kind of property you have, where it is, and how many guests can stay." },
  { id: "property-type", title: "Which of these best describes your place?" },
  { id: "privacy-type", title: "What type of place will guests have?" },
  { id: "location", title: "Is the pin in the right spot?", description: "Guests see an approximate location until they book." },
  { id: "visibility", title: "Choose how guests see your location on a map", description: "You can show an exact pin or keep the location approximate before booking." },
  { id: "basics", title: "Share some basics about your place", description: "You’ll add more details later, like bed types." },
  { id: "standout-intro", eyebrow: "Step 2", title: "Make your place stand out", description: "Add amenities, photos, a title, and a description guests will remember." },
  { id: "amenities", title: "Tell guests what your place has to offer", description: "You can add more amenities after you publish your listing." },
  { id: "photos", title: "Add some photos of your house", description: "You’ll need 5 photos to get started. Landscape shots look best—they fill a 980 × 580 carousel on your listing page." },
  { id: "highlights", title: "Next, let’s describe your house", description: "Choose up to 2 highlights. We’ll use these to shape your description." },
  { id: "title", title: "Now, let’s give your house a title", description: "Short titles work best. You can always change it later." },
  { id: "description", title: "Create your description", description: "Share what makes your place special." },
  { id: "finish-intro", eyebrow: "Step 3", title: "Finish up and publish", description: "Choose booking settings, price your stay, and finish the final trust details." },
  { id: "booking", title: "Pick your booking settings", description: "You can change this later." },
  { id: "pricing", title: "Now, set a weekday base price", description: "Start with a nightly price guests will see before taxes." },
  { id: "weekend-pricing", title: "Set a weekend price", description: "Add a premium for Fridays and Saturdays." },
  { id: "discounts", title: "Add discounts", description: "Help your place stand out and earn your first reviews." },
  { id: "safety", title: "Share safety details", description: "Guests need to know these before they book." },
  { id: "final-details", title: "Provide a few final details", description: "This helps prevent fraud and keeps payouts compliant." },
  { id: "review", title: "Review your listing", description: "A final pass before we send it for approval." },
  { id: "publish", title: "Ready to publish", description: "Everything required is in place. Your listing will be sent for approval." },
];

export const propertyTypes: WizardOption[] = [
  ["house", "House", "house"], ["apartment", "Apartment", "building-2"], ["cabin", "Cabin", "tent-tree"],
  ["villa", "Villa", "landmark"], ["tiny-home", "Tiny home", "home"], ["hotel", "Hotel", "hotel"],
  ["farm", "Farm", "tractor"], ["guesthouse", "Guesthouse", "door-open"], ["condo", "Condo", "building"],
  ["resort", "Resort", "palmtree"], ["beach-house", "Beach house", "waves"], ["treehouse", "Treehouse", "tree-pine"],
].map(([id, label, icon]) => ({ id, label, icon }));

export const privacyTypes: WizardOption[] = [
  { id: "entire", label: "An entire place", description: "Guests have the whole place to themselves.", icon: "house" },
  { id: "private", label: "A private room", description: "Guests have their own room, plus shared spaces.", icon: "door-open" },
  { id: "shared", label: "A shared room", description: "Guests sleep in a shared room with others.", icon: "users" },
];

export const highlightOptions: WizardOption[] = [
  ["peaceful", "Peaceful", "leaf"], ["unique", "Unique", "sparkles"], ["family", "Family-friendly", "baby"],
  ["stylish", "Stylish", "lamp"], ["central", "Central", "map-pin"], ["spacious", "Spacious", "users"],
].map(([id, label, icon]) => ({ id, label, icon }));

export const amenityGroups: AmenityGroup[] = [
  { id: "favorites", title: "Guest favorites", items: [["wifi", "Wifi", "wifi"], ["tv", "TV", "tv"], ["kitchen", "Kitchen", "cooking-pot"], ["washer", "Washer", "washing-machine"], ["parking", "Free parking", "car-front"], ["workspace", "Workspace", "laptop"], ["aircon", "Air conditioning", "snowflake"]].map(([id, label, icon]) => ({ id, label, icon })) },
  { id: "standout", title: "Standout amenities", items: [["pool", "Pool", "waves"], ["hot-tub", "Hot tub", "bath"], ["patio", "Patio", "umbrella"], ["bbq", "BBQ grill", "flame"], ["outdoor-dining", "Outdoor dining", "utensils-crossed"], ["fire-pit", "Fire pit", "bonfire"]].map(([id, label, icon]) => ({ id, label, icon })) },
  { id: "safety", title: "Safety items", items: [["smoke-alarm", "Smoke alarm", "alarm-smoke"], ["first-aid", "First aid kit", "briefcase-medical"], ["extinguisher", "Fire extinguisher", "fire-extinguisher"], ["carbon-monoxide", "Carbon monoxide alarm", "shield-alert"]].map(([id, label, icon]) => ({ id, label, icon })) },
];
