export const userIds = [
    "Harry Potter",
    "Hedwig",
    "Voldemort",
    "Hermione",
    "Viktor Krum",
    "Ron Weasely",
    "Ginny",
    "Seamus Finnigan",
    "Nagini",
    "Dobby",
    "Nymphadora Tonks",
    "Sirius Black",
    "Luna Lovegood",
    "Peter Pettigrew",
    "Moaning Myrtle",
    "Kreacher",
    "Crookshanks",
    "Dumbledore",
    "Snape",
    "Draco",
    "Lucius Malfoy",
    "Bellatrix Lestrange",
    "Anthony Goldstein",
    "Neville Longbottom",
    "Peeves",
    "McGonagall",
    "Fleur Delacour",
    "James Potter",
    "Newt Scamander",
    "Lily Potter",
    "Professor Flitwick",
    "Alastor Moody",
    "Argus Filch",
    "Trelawney",
    "Rita Skeeter",
    "Cornelius Fudge"
  ];

export const getRandomUserId = () => {
  const index = Math.ceil(Math.random() * (userIds.length - 1));
  return userIds[index];
}