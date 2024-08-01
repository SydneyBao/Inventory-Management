'use client'

import { useState, useEffect } from 'react';
import { GoogleAuthProvider, signInWithPopup, onAuthStateChanged, signInWithEmailAndPassword,
  createUserWithEmailAndPassword, sendSignInLinkToEmail, isSignInWithEmailLink, signInWithEmailLink} from "firebase/auth";
import { auth, firestore } from "./firebase";
import { signOut } from "firebase/auth";
import {collection, doc, getDocs, query, setDoc, deleteDoc, getDoc} from 'firebase/firestore';
import { Modal, Box, Stack, Grid, TextField, Button, Typography, MenuItem, Menu, IconButton, Tooltip, InputAdornment } from '@mui/material';
import MoreVertIcon from '@mui/icons-material/MoreVert';
import AddIcon from '@mui/icons-material/Add';
import RemoveIcon from '@mui/icons-material/Remove';
import DeleteOutlineOutlinedIcon from '@mui/icons-material/DeleteOutlineOutlined';
import ModeEditOutlineOutlinedIcon from '@mui/icons-material/ModeEditOutlineOutlined';
import SearchOutlinedIcon from '@mui/icons-material/SearchOutlined';
import GoogleIcon from '@mui/icons-material/Google';
import EmailIcon from '@mui/icons-material/Email';

const style = {
  modalHeader: {
    color: '#333'
  },
  modal: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: 'translate(-50%, -50%)',
    width: '80%',
    maxWidth: 400,
    bgcolor: 'background.paper',
    borderRadius: 2,
    boxShadow: 24,
    p: 4,
    display: 'flex',
    flexDirection: 'column',
    gap: 3,
    color: '#333'
  },
  list: {
    position: 'relative',
    width: '40vw',
    height: '90vh',
    background: '#f9f9f9',
    borderRadius: 2,
    overflow: 'hidden',
    boxShadow: 24,
  },
  menuButton: {
    position: 'absolute',
    right: "3%",
    top: 5
  },
  item: {
    display: 'flex',
    justifyContent: 'space-between',
    alignItems: 'center'
  },
  inventory: {
    mb: 2,
    p: 2,
    background: '#E4E6E9',
    borderRadius: 5,
    color: '#333'
  },
  inventoryStack: {
    width: '95%',
    height: '100%',
    spacing: 1,
    overflow: 'auto',
    py: 2
  },
  inventoryText: {
    display: 'flex',
    flexDirection: 'column'
  },
  centerContent: {
    display: 'flex',
    justifyContent: 'center',
    alignItems: 'center'
  },
  bottom: {
    position: 'absolute',
    bottom: 16
  }
};

export default function Home() {
  const [inventory, setInventory] = useState([]);
  const [tempInventory, setTempInventory] = useState([]);
  const [itemName, setItemName] = useState('');
  const [description, setDescription] = useState('');
  const [expirationDate, setExpirationDate] = useState('');
  const [open, setOpen] = useState(false);
  const [updateOpen, setUpdateOpen] = useState(false);
  const [updateItemData, setUpdateItemData] = useState(null);
  const [signInOpen, setSignInOpen] = useState(true);
  const [userEmail, setUserEmail] = useState(null);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [anchorEl, setAnchorEl] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');

  const handleOpen = () => setOpen(true);
  const handleClose = () => setOpen(false);
  const handleSignInClose = () => setSignInOpen(false); 
  const handleUpdateOpen = (item) => {
    setUpdateItemData(item);
    setUpdateOpen(true);
  };
  const handleUpdateClose = () => setUpdateOpen(false);
  
  const handleSearch = (e) => {
    setSearchTerm(e.target.value.toLowerCase());
  };

  const filteredInventory = inventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm)
  );  
  const filteredTempInventory = tempInventory.filter(item =>
    item.name.toLowerCase().includes(searchTerm)
  );
  
  // Fetch inventory data from Firestore
  const updateInventory = async (email) => {
    if (!email) return;
    const collectionRef = collection(firestore, email); 
    const snapshot = query(collectionRef);
    const docs = await getDocs(snapshot);
    const inventoryList = [];
    docs.forEach((doc) => {
      inventoryList.push({ name: doc.id, ...doc.data() });
    });
    setInventory(inventoryList);
  };

  // Add item
  const addItem = async (item) => {
    if (userEmail) {
      const collectionRef = collection(firestore, userEmail);
      const docRef = doc(collectionRef, item.name);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        await setDoc(docRef, { quantity: quantity + 1 }, { merge: true });
      } else {
        await setDoc(docRef, { 
          quantity: 1, 
          description: item.description, 
          expirationDate: item.expirationDate 
        });
      }
      await updateInventory(userEmail);
    } else {
      setTempInventory(prev => {
        const existingItem = prev.find(i => i.name === item.name);
        if (existingItem) {
          return prev.map(i => i.name === item.name ? { ...i, quantity: i.quantity + 1 } : i);
        } else {
          return [...prev, { name: item.name, quantity: 1, description: item.description, expirationDate: item.expirationDate }];
        }
      });
    }
  };

  // Remove item
  const removeItem = async (itemName) => {
    if (userEmail) {
      const collectionRef = collection(firestore, userEmail); 
      const docRef = doc(collectionRef, itemName);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const { quantity } = docSnap.data();
        if (quantity === 1) {
          await deleteDoc(docRef);
        } else {
          await setDoc(docRef, { quantity: quantity - 1 }, { merge: true });
        }
      }
      await updateInventory(userEmail);
    } else {
      setTempInventory(prev => {
        const existingItem = prev.find(i => i.name === itemName);
        if (existingItem.quantity === 1) {
          return prev.filter(i => i.name !== itemName);
        } else {
          return prev.map(i => i.name === itemName ? { ...i, quantity: i.quantity - 1 } : i);
        }
      });
    }
  };

  // Delete Item
  const deleteItem = async (itemName) => {
    if (userEmail) {
      const collectionRef = collection(firestore, userEmail); 
      const docRef = doc(collectionRef, itemName);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        await deleteDoc(docRef);
      }
      await updateInventory(userEmail);
    } else {
      setTempInventory(prev => prev.filter(i => i.name !== itemName));
    }
  };

  // Update Item
  const updateItem = async (item) => {
    if (userEmail) {
      const collectionRef = collection(firestore, userEmail);
      const docRef = doc(collectionRef, item.name);
      await setDoc(docRef, item);
      await updateInventory(userEmail);
    } else {
      setTempInventory(prev => prev.map(i => i.name === item.name ? item : i));
    }
  };


  const handleMenuOpen = (event) => {
    setAnchorEl(event.currentTarget);
  };
  
  const handleMenuClose = () => {
    setAnchorEl(null);
  };
  
  const toTitleCase = (str) => {
    return str
      .toLowerCase()
      .split(' ')
      .map(word => word.charAt(0).toUpperCase() + word.slice(1))
      .join(' ');
  };

  const formatDate = (dateStr) => {
    const date = new Date(dateStr);
    const month = (date.getMonth() + 1).toString().padStart(2, '0'); 
    const day = date.getDate().toString().padStart(2, '0');
    const year = date.getFullYear();
    return `${month}/${day}/${year}`;
  };

  const handleGoogle = async (e) => {
    const provider = new GoogleAuthProvider();
    try {
      const result = await signInWithPopup(auth, provider);
      const email = result.user.email;
      setUserEmail(email);

      const collectionName = `inventory_${email.replace('@', '_at_')}`;
      for (const item of tempInventory) {
        const docRef = doc(collection(firestore, collectionName), item.name);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const { quantity } = docSnap.data();
          await setDoc(docRef, { quantity: quantity + item.quantity });
        } else {
          await setDoc(docRef, { quantity: item.quantity });
        }
      }

      setTempInventory([]);

      await updateInventory(email);
    } catch (error) {
      console.error("Error signing in with Google", error);
    }
  };
  
  const handleEmailPasswordSignIn = async (e) => {
    e.preventDefault();
    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      setUserEmail(userCredential.user.email);
      updateInventory(userCredential.user.email);
    } catch (error) {
      console.error("Error signing in with email/password", error);
      
      if (error.code === 'auth/invalid-email') {
        alert("Please enter a valid email address");
      } else if (error.code === 'auth/invalid-credential') {
        try {
          const newUserCredential = await createUserWithEmailAndPassword(auth, email, password);
          setUserEmail(newUserCredential.user.email);
          updateInventory(newUserCredential.user.email);
        } catch (createError) {
          if (createError.code === 'auth/invalid-email') {
            alert("Please enter a valid email address");
          } else if (createError.code === 'auth/weak-password') {
            alert("Your password must be at least six characters");
          } else {
            alert("Incorrect email or password. Please try again");
          }
        }
      } else {
        alert("Incorrect email or password. Please try again");
      }
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && signInOpen) {
      handleEmailPasswordSignIn(e);
    }
  };
  
  const handleEmailLinkSignIn = async (e) => {
    e.preventDefault();
    if (!email || !email.includes('@')) {
      alert("Please enter a valid email address");
      return;
    }
    const actionCodeSettings = {
      url: window.location.href,
      handleCodeInApp: true,
    };
    try {
      await sendSignInLinkToEmail(auth, email, actionCodeSettings);
      window.localStorage.setItem('emailForSignIn', email);
      alert('Check your email for the sign-in link');
    } catch (error) {
      console.error("Error sending sign-in link to email", error);
    }
  };

  //when user logs in
  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setSignInOpen(false);
        setUserEmail(user.email);
        updateInventory(user.email);
      } else {
        setUserEmail(null);
      }
    });
    return () => unsubscribe();
  }, []);

  //email link log in
  useEffect(() => {
    if (isSignInWithEmailLink(auth, window.location.href)) {
      let email = window.localStorage.getItem('emailForSignIn');
      if (!email) {
        email = window.prompt('Please provide your email for confirmation');
        window.localStorage.setItem('emailForSignIn', email);
      }
      signInWithEmailLink(auth, email, window.location.href)
        .then((result) => {
          window.localStorage.removeItem('emailForSignIn');
          setUserEmail(result.user.email);
          updateInventory(result.user.email);
        })
        .catch((error) => {
          console.error("Error signing in with email link", error);
        });
    }
  }, []);

  //sign out
  const handleSignOut = async () => {
    try {
      await signOut(auth);
      setUserEmail(null); 
      setInventory([]); 
      setSignInOpen(true); 
    } catch (error) {
      console.error("Error signing out", error);
    }
  };

  return (
    <Box
      width="100vw"
      height="100vh"
      bgcolor={'#b1b7c1'}
      sx={style.centerContent}
    >
      {/* sign in modal */}
      <Modal
        open={signInOpen}
        onClose={handleSignInClose}
        aria-labelledby="sign-in-modal-title"
      >
        <Box sx={[style.modal, {textAlign: 'center'}]}>
          <Typography id="sign-in-modal-title" variant="h5">
            Sign In or Create Account
          </Typography>
          <TextField 
            label="Email" 
            variant="outlined"
            fullWidth
            value={email} 
            onChange={(e) => setEmail(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            onKeyDown={handleKeyDown}
          />
          <TextField 
            label="Password" 
            type="password" 
            variant="outlined"
            fullWidth
            value={password} 
            onChange={(e) => setPassword(e.target.value)}
            margin="normal"
            InputLabelProps={{ shrink: true }}
            onKeyDown={handleKeyDown}
          />
          <Button 
            variant="contained" 
            color="primary" 
            fullWidth 
            onClick={handleEmailPasswordSignIn}
          >
            Sign In
          </Button>
          <Stack direction="row" spacing={1}>
            <Tooltip title="Sign In with Email Link" arrow>
              <Button 
                variant="outlined" 
                color="primary" 
                onClick={handleEmailLinkSignIn}
                startIcon={<EmailIcon />}
                fullWidth
              ></Button>
            </Tooltip>
            <Tooltip title="Sign In with Google" arrow>
              <Button 
                variant="outlined" 
                startIcon={<GoogleIcon />} 
                onClick={handleGoogle}
                fullWidth
              >
              </Button>
            </Tooltip>
          </Stack>
        </Box>
      </Modal>

      {/* add item modal */}
      <Modal
        open={open}
        onClose={handleClose}
        aria-labelledby="add-item-modal-title"
      >
        <Box sx={style.modal}>
          <Typography variant="h6" component="h2" gutterBottom textAlign={"center"} id="add-item-modal-title">
            Add New Item
          </Typography>
          <Grid container spacing={2}>
            <Grid item xs={12}>
              <TextField
                id="item-name"
                label="Item"
                variant="outlined"
                fullWidth
                value={itemName}
                onChange={(e) => setItemName(e.target.value)}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Expiration Date"
                variant="outlined"
                fullWidth
                type="date"
                value={expirationDate}
                onChange={(e) => setExpirationDate(e.target.value)}
                margin="normal"
                InputLabelProps={{ shrink: true }}
              />
            </Grid>
            <Grid item xs={12}>
              <TextField
                label="Notes"
                variant="outlined"
                fullWidth
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                margin="normal"
              />
            </Grid>
            <Grid item xs={12}>
              <Button
                variant="contained"
                color="primary"
                onClick={() => {
                  addItem({ name: itemName, description, expirationDate });
                  setItemName('');
                  setDescription('');
                  setExpirationDate('');
                  handleClose();
                }}
                fullWidth
              >
                Add
              </Button>
            </Grid>
          </Grid>
        </Box>
      </Modal>
            
      {/* Update Modal */}
      <Modal open={updateOpen} onClose={handleUpdateClose}>
        <Box sx={style.modal}>
          <Typography variant="h6" sx={style.modalHeader} textAlign={"center"}>Edit Item</Typography>
          {updateItemData && (
            <>
              <TextField
                label="Item Name"
                value={updateItemData.name}
                onChange={(e) => setUpdateItemData(prev => ({ ...prev, name: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Description"
                value={updateItemData.description}
                onChange={(e) => setUpdateItemData(prev => ({ ...prev, description: e.target.value }))}
                fullWidth
              />
              <TextField
                label="Expiration Date"
                type="date"
                value={updateItemData.expirationDate}
                onChange={(e) => setUpdateItemData(prev => ({ ...prev, expirationDate: e.target.value }))}
                fullWidth
                InputLabelProps={{
                  shrink: true,
                }}
              />
              <Button
                variant="contained"
                onClick={() => {
                  updateItem(updateItemData);
                  setUpdateItemData(null);
                  handleUpdateClose();
                }}
              >
              Confirm
              </Button>
            </>
          )}
        </Box>
      </Modal>

      {/* list */}
      <Box sx={style.list}>
        
        {/* header */}
        <Box
          height={"170px"}
          display="flex"
          flexDirection={'column'}
          justifyContent="space-between"
          alignItems="center"
          boxShadow={4}
          sx={style.centerContent}
        >
          {/* search bar */}
          <Box sx={{ width: '80%', bgcolor: '#f5f5f5', mb: 2, display: 'flex', alignItems: 'center'}}>
            <IconButton sx={{ pt: '23px' }}>
              <SearchOutlinedIcon />
            </IconButton>
            <TextField
              label="Search"
              variant="standard"
              fullWidth
              value={searchTerm}
              onChange={handleSearch}
              sx={{ 
                '& .MuiInput-underline:before': { 
                  borderBottomColor: '#333', 
                },
                '& .MuiInput-underline:after': { 
                  borderBottomColor: 'black',
                },
              }}
            />
          </Box>

          <Typography variant="h6" color={'#333'}>
            Welcome, {userEmail ? userEmail.split('@')[0] : "Guest"}
          </Typography>

          <Typography 
            variant={'h2'} 
            sx={{
              color: '#333',
              fontSize: 30,
              textAlign: 'center',
              mb: 2
            }}
          >
            What&apos;s In Your Inventory?
          </Typography>


          {/* Menu button positioned absolutely */}
          <Box sx={{ position: 'absolute', top: 5, right: 5 }}>
            {userEmail ? (
              <>
                <IconButton
                  aria-label="more"
                  aria-controls="long-menu"
                  aria-haspopup="true"
                  onClick={handleMenuOpen}
                  sx={style.menuButton}
                >
                  <MoreVertIcon />
                </IconButton>
                <Menu
                  id="long-menu"
                  anchorEl={anchorEl}
                  keepMounted
                  open={Boolean(anchorEl)}
                  onClose={handleMenuClose}
                >
                  <MenuItem onClick={() => {
                    handleSignOut();
                    handleMenuClose();
                  }}>
                    Sign Out
                  </MenuItem>
                </Menu>
              </>
            ) : (
              <IconButton
                aria-label="sign in"
                onClick={() => {
                  setSignInOpen(true);
                  handleMenuClose();
                }}
                sx={style.menuButton}
              >
                <MoreVertIcon />
              </IconButton>
            )}
          </Box>
        </Box>
        <Box position="relative" sx={style.centerContent}>
          <Stack sx={style.inventoryStack}>
            {userEmail ? (
              filteredInventory.map((item) => (
                <Box
                  key={item.name}
                  sx={[style.item, style.inventory]}
                >
                  <Box sx={style.inventoryText}>
                    <Typography variant="h6">{toTitleCase(item.name)}</Typography>
                    {item.expirationDate && (
                      <Typography variant="body2">Expires: {formatDate(item.expirationDate)}</Typography>
                    )}
                    {item.description && (
                      <Typography variant="body2">{item.description}</Typography>
                    )}                      
                  </Box>
                  <Box sx={[{ gap: 1 }, style.centerContent, { marginTop: 1 }]}>
                      <IconButton onClick={() => removeItem(item.name)} color="black" size="small">
                        <RemoveIcon />
                      </IconButton>
                      <Typography variant="body1">{item.quantity}</Typography>
                      <IconButton onClick={() => addItem(item.name)} color="black" size="small">
                        <AddIcon />
                      </IconButton>
                      <Tooltip title="Edit">
                        <IconButton onClick={() => handleUpdateOpen(item)}>
                          <ModeEditOutlineOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton onClick={() => deleteItem(item.name)} color="error" size="small">
                          <DeleteOutlineOutlinedIcon />
                        </IconButton>
                      </Tooltip>
                  </Box>
                </Box>

              ))
            ) : (
              filteredTempInventory.map((item) => (
                <Box
                  key={item.name}
                  sx={[style.item, style.inventory]}
                >
                  <Box sx={style.inventoryText}>
                    <Typography variant="h6">{toTitleCase(item.name)}</Typography>
                    {item.expirationDate && (
                      <Typography variant="body2">Expires: {formatDate(item.expirationDate)}</Typography>
                    )}
                    {item.description && (
                      <Typography variant="body2">{item.description}</Typography>
                    )}                      
                  </Box>
                  <Box sx={[{ gap: 1 }, style.centerContent, { marginTop: 1 }]}>
                    <IconButton onClick={() => removeItem(item.name)} color="black" size="small">
                      <RemoveIcon />
                    </IconButton>
                    <Typography variant="body1">{item.quantity}</Typography>
                    <IconButton onClick={() => addItem(item.name)} color="black" size="small">
                      <AddIcon />
                    </IconButton>
                    <IconButton onClick={() => deleteItem(item.name)} color="error" size="small">
                      <DeleteOutlineOutlinedIcon />
                    </IconButton>
                  </Box>
                </Box>
              ))
            )}
          </Stack>

        </Box>
        <IconButton
          color="primary"
          onClick={handleOpen}
          sx={[{
            right: 16,
            bgcolor: 'primary.main',
            '&:hover': {
              bgcolor: 'primary.dark',
            },
            width: 56,
            height: 56,
            boxShadow: 5,
          }, style.bottom]}
        >
          <AddIcon sx={{ color: 'white' }} />
        </IconButton>
      </Box>
    </Box>
  );
}
