const Contact = require('../models/Contacts');
const User = require('../models/User');
const Friendship = require('../models/friendshipSchema')


  

// Sync contacts
exports.syncContacts = async (req, res) => {
  const { contacts } = req.body;
  const userId = req.user._id; 

  if (!contacts || !Array.isArray(contacts)) {
    return res.status(400).json({ error: 'Invalid input: contacts must be an array.' });
  }

  try {
    const contactPromises = contacts.map(async (contact) => {
      if (!contact.name || !contact.phoneNumber) {
        throw new Error('Contact must have a name and phone number');
      }

     
      const existingContact = await Contact.findOne({
        user: userId,
        phoneNumber: contact.phoneNumber
      });

    
      if (existingContact) {
        console.log(`Contact ${contact.name} already exists for this user. Skipping...`);
        return null; 
      }

    
      return new Contact({
        user: userId,
        name: contact.name,
        phoneNumber: contact.phoneNumber,
        email: contact.email || null
      }).save();
    });

  
    await Promise.all(contactPromises);

    res.status(200).json({ message: 'Contacts synced successfully!' });
  } catch (error) {
    console.error('Error syncing contacts:', error);

    if (error instanceof mongoose.Error.ValidationError) {
      return res.status(400).json({ error: 'Validation error: ' + error.message });
    }

    if (error.message.includes('Contact must have a name and phone number')) {
      return res.status(400).json({ error: error.message });
    }

    res.status(500).json({ error: 'Failed to sync contacts.' });
  }
};




//retrieve n display all contacts
exports.getContacts = async (req, res) => {
  try {
    const contacts = await Contact.find();
    res.status(200).json(contacts);
  } catch (error) {
    res.status(500).json({ error: 'Failed to fetch contacts.' });
  }
};





// // Search by name, username, or phone number (within user's contact list)
// exports.searchByNameOrPhoneNumber = async (req, res) => {
//   const searchTerm = req.query.search; 
//   const userId = req.user._id;

//   if (!searchTerm) {
//     return res.status(400).json({ error: 'Search query parameter (name, username, or phone number) is required.' });
//   }

//   try {
    
//     const contacts = await Contact.find({
//       user: userId,
//       $or: [
//         { name: { $regex: `^${searchTerm}`, $options: 'i' } },
//         { username: { $regex: `^${searchTerm}`, $options: 'i' } },
//         { phoneNumber: { $regex: `^${searchTerm}`, $options: 'i' } } 
//       ]
//     });

    
//     if (!contacts.length) {
//       return res.status(404).json({ message: 'No contacts found with this name, username, or phone number in your contacts.' });
//     }

   
//     const result = [];

    
//     for (const contact of contacts) {
      
//       const user = await User.findOne({ phoneNumber: contact.phoneNumber });

//       // let status = 'devian';
//       let status = 'contacts';
     
//       if (user) {
//         const isInContacts = await Contact.findOne({ user: userId, phoneNumber: user.phoneNumber });
//         if (isInContacts) {
//           // status = 'contacts';
//           status = 'devian';
//         }

//         const friendship = await Friendship.findOne({
//           $or: [
//             { requester: userId, recipient: user._id, status: 'accepted' },
//             { requester: user._id, recipient: userId, status: 'accepted' }
//           ]
//         });

//         if (friendship) {
//           status = 'looped';
//         }

        
//         result.push({
//           name: user.name,
//           username: user.username,
//           profileImg: user.profileImg,
//           gender: user.gender,
//           dob: user.dob,
//           phoneNumber: user.phoneNumber,
//           mailAddress: user.mailAddress,
//           bio: user.bio,
//           link: user.link,
//           status: status
//         });
//       } else {
        
//         result.push({
//           name: contact.name,
//           phoneNumber: contact.phoneNumber,
//           email: contact.email,
//           status: 'contacts'
//         });
//       }
//     }

   
//     return res.status(200).json({
//       message: 'Search completed successfully.',
//       data: result
//     });

//   } catch (error) {
//     console.error('Error searching by name, username, or phone number:', error);
//     return res.status(500).json({ error: 'Failed to search by name, username, or phone number.' });
//   }
// };










// // Search by name, username, or phone number
// exports.searchByNameOrPhoneNumber = async (req, res) => {
//   const searchTerm = req.query.search;
//   const userId = req.user._id;

//   if (!searchTerm) {
//     return res.status(400).json({ error: 'Search query parameter (name, username, or phone number) is required.' });
//   }

//   try {
   
//     const contacts = await Contact.find({
//       user: userId,
//       $or: [
//         { name: { $regex: `^${searchTerm}`, $options: 'i' } },
//         { phoneNumber: { $regex: `^${searchTerm}`, $options: 'i' } }
//       ]
//     });

//     const result = [];

    
//     for (const contact of contacts) {
     
//       const user = await User.findOne({ phoneNumber: contact.phoneNumber });


//       let status = 'contacts';

    
//       if (user) {
       
//         const isInContacts = await Contact.findOne({ user: userId, phoneNumber: user.phoneNumber });
//         if (isInContacts) {
//           status = 'devian';

         
//           const friendship = await Friendship.findOne({
//             $or: [
//               { requester: userId, recipient: user._id, status: 'accepted' },
//               { requester: user._id, recipient: userId, status: 'accepted' }
//             ]
//           });

         
//           if (friendship) {
//             status = 'looped';
//           }
//         }

       
//         result.push({
//           name: user.name,
//           username: user.username,
//           profileImg: user.profileImg,
//           gender: user.gender,
//           dob: user.dob,
//           phoneNumber: user.phoneNumber,
//           mailAddress: user.mailAddress,
//           bio: user.bio,
//           link: user.link,
//           status: status
//         });
//       } else {
       
//         result.push({
//           name: contact.name,
//           phoneNumber: contact.phoneNumber,
//           email: contact.email,
//           status: 'contacts'
//         });
//       }
//     }

   
//     const users = await User.find({
//       username: { $regex: `^${searchTerm}`, $options: 'i' }
//     });

//     for (const user of users) {
      
//       const isInContacts = await Contact.findOne({ user: userId, phoneNumber: user.phoneNumber });
//       let status = 'contacts';

//       if (isInContacts) {
//         status = 'devian';

       
//         const friendship = await Friendship.findOne({
//           $or: [
//             { requester: userId, recipient: user._id, status: 'accepted' },
//             { requester: user._id, recipient: userId, status: 'accepted' }
//           ]
//         });

//         if (friendship) {
//           status = 'looped';
//         }
//       }

    
//       result.push({
//         name: user.name,
//         username: user.username,
//         profileImg: user.profileImg,
//         gender: user.gender,
//         dob: user.dob,
//         phoneNumber: user.phoneNumber,
//         mailAddress: user.mailAddress,
//         bio: user.bio,
//         link: user.link,
//         status: status
//       });
//     }

//     if (result.length === 0) {
//       return res.status(404).json({ message: 'No matching users or contacts found.' });
//     }

//     return res.status(200).json({
//       message: 'Search completed successfully.',
//       data: result
//     });
//   } catch (error) {
//     console.error('Error searching by name, username, or phone number:', error);
//     return res.status(500).json({ error: 'Failed to search by name, username, or phone number.' });
//   }
// };




// Search by name, username, or phone number
exports.searchByNameOrPhoneNumber = async (req, res) => {
  const searchTerm = req.query.search;
  const userId = req.user._id;

  if (!searchTerm) {
    return res.status(400).json({ error: 'Search query parameter (name, username, or phone number) is required.' });
  }

  
  const normalizePhoneNumber = (phoneNumber) => {
   
    if (phoneNumber.startsWith('+91')) {
      phoneNumber = phoneNumber.slice(3);
    }
   
    return phoneNumber.replace(/[^0-9]/g, '');
  };

  try {
    const result = [];

    
    const normalizedSearchTerm = normalizePhoneNumber(searchTerm);

   
    const contacts = await Contact.find({
      user: userId,
      $or: [
        
        { name: { $regex: `^${searchTerm}`, $options: 'i' } },
       
        { phoneNumber: { $regex: `^${normalizedSearchTerm}`, $options: 'i' } }
      ]
    });

    for (const contact of contacts) {
     
      const normalizedContactPhone = normalizePhoneNumber(contact.phoneNumber);

      
      const user = await User.findOne({ phoneNumber: normalizedContactPhone });

      let status = 'contacts';

      if (user) {
        status = 'devian';

      
        const friendship = await Friendship.findOne({
          $or: [
            { requester: userId, recipient: user._id, status: 'accepted' },
            { requester: user._id, recipient: userId, status: 'accepted' }
          ]
        });

        if (friendship) {
          status = 'looped';
        }

       
        result.push({
          name: user.name,
          username: user.username,
          profileImg: user.profileImg,
          gender: user.gender,
          dob: user.dob,
          phoneNumber: user.phoneNumber,
          mailAddress: user.mailAddress,
          bio: user.bio,
          link: user.link,
          status: status
        });
      } else {
      
        result.push({
          name: contact.name,
          phoneNumber: contact.phoneNumber,
          email: contact.email,
          status: 'contacts'
        });
      }
    }

    
    const users = await User.find({
      $or: [
      
        { username: { $regex: `^${searchTerm}`, $options: 'i' } },
       
        { phoneNumber: { $regex: `^${normalizedSearchTerm}`, $options: 'i' } }
      ]
    });

    for (const user of users) {
      const isInContacts = await Contact.findOne({ user: userId, phoneNumber: normalizePhoneNumber(user.phoneNumber) });
      let status = 'contacts';

      if (isInContacts) {
        status = 'devian';

        
        const friendship = await Friendship.findOne({
          $or: [
            { requester: userId, recipient: user._id, status: 'accepted' },
            { requester: user._id, recipient: userId, status: 'accepted' }
          ]
        });

        if (friendship) {
          status = 'looped';
        }
      }

     
      result.push({
        name: user.name,
        username: user.username,
        profileImg: user.profileImg,
        gender: user.gender,
        dob: user.dob,
        phoneNumber: user.phoneNumber,
        mailAddress: user.mailAddress,
        bio: user.bio,
        link: user.link,
        status: status
      });
    }

    if (result.length === 0) {
      return res.status(404).json({ message: 'No matching users or contacts found.' });
    }

    return res.status(200).json({
      message: 'Search completed successfully.',
      data: result
    });
  } catch (error) {
    console.error('Error searching by name, username, or phone number:', error);
    return res.status(500).json({ error: 'Failed to search by name, username, or phone number.' });
  }
};
