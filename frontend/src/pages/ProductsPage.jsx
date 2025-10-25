import React, { useState, useEffect, useMemo } from 'react';
import {
  Container,
  Grid,
  Card,
  CardMedia,
  CardContent,
  CardActions,
  Typography,
  TextField,
  Button,
  IconButton,
  Chip,
  Box,
  Paper,
  InputAdornment,
  MenuItem,
  Select,
  FormControl,
  Collapse,
  CircularProgress,
  ToggleButtonGroup,
  ToggleButton,
  Avatar,
  Stack,
  Divider,
  Fab,
  Fade, Dialog,
  DialogContent
} from '@mui/material';
import {
  Search,
  ShoppingCart,
  Add as Plus,
  Inventory as Package,
  Star,
  FilterList as Filter,
  GridView as Grid3x3,
  ViewList as List,
  TuneOutlined as SlidersHorizontal,
  Favorite,
  FavoriteBorder,
  Visibility as Eye,
  TrendingUp,
  CardGiftcard as Gift,
  LocalOffer as Tag,
  Schedule as Clock,
  Close as X,
  SmartToy as Bot,
  AutoAwesome as Sparkles,
  CheckCircle,
  KeyboardArrowUp
} from '@mui/icons-material';

import {
  Close as CloseIcon,
  ZoomIn,
} from '@mui/icons-material';
import { productService } from '../services/productService';
import { cartService } from '../services/cartService';
import { useAuth } from '../context/AuthContext';
import { useCart } from '../context/CartContext';
import toast from 'react-hot-toast';

const ProductsPage = () => {
  // State management
  const [products, setProducts] = useState([]);
  const [filteredProducts, setFilteredProducts] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [loading, setLoading] = useState(true);
  const [viewMode, setViewMode] = useState('grid');
  const [sortBy, setSortBy] = useState('name');
  const [priceRange, setPriceRange] = useState({ min: 0, max: 10000 });
  const [showFilters, setShowFilters] = useState(false);
  const [favorites, setFavorites] = useState(new Set());
  const [addingToCart, setAddingToCart] = useState(new Set());
  const [showScrollTop, setShowScrollTop] = useState(false);
  const [selectedImage, setSelectedImage] = useState(null);
  const [imageModalOpen, setImageModalOpen] = useState(false);

  const { user } = useAuth();
  const { refreshCart } = useCart();

  // Scroll listener
  useEffect(() => {
    const handleScroll = () => {
      setShowScrollTop(window.scrollY > 400);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Load products on mount
  useEffect(() => {
    loadProducts();
    loadFavorites();
  }, []);

  // Filter and sort products when dependencies change
  useEffect(() => {
    filterAndSortProducts();
  }, [products, searchQuery, sortBy, priceRange]);

  const loadProducts = async () => {
    setLoading(true);
    try {
      const data = await productService.getProducts();
      console.log('Primer producto completo:', data[0]); // ← AGREGA ESTO
      setProducts(data);

      if (data.length > 0) {
        const prices = data.map(p => p.precio);
        const minPrice = Math.min(...prices);
        const maxPrice = Math.max(...prices);
        setPriceRange({ min: 0, max: Math.ceil(maxPrice * 1.1) });
      }
    } catch (error) {
      toast.error('Error al cargar productos');
      console.error('Error loading products:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleImageClick = (imageUrl) => {
    setSelectedImage(imageUrl);
    setImageModalOpen(true);
  };

  const handleCloseImageModal = () => {
    setImageModalOpen(false);
    setSelectedImage(null);
  };


  const loadFavorites = () => {
    const savedFavorites = localStorage.getItem('favorites');
    if (savedFavorites) {
      setFavorites(new Set(JSON.parse(savedFavorites)));
    }
  };

  const filterAndSortProducts = () => {
    let filtered = [...products];

    if (searchQuery.trim()) {
      filtered = filtered.filter(product =>
        product.nombre.toLowerCase().includes(searchQuery.toLowerCase()) ||
        (product.descripcion && product.descripcion.toLowerCase().includes(searchQuery.toLowerCase()))
      );
    }

    filtered = filtered.filter(product =>
      product.precio >= priceRange.min && product.precio <= priceRange.max
    );

    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-low':
          return a.precio - b.precio;
        case 'price-high':
          return b.precio - a.precio;
        case 'stock':
          return b.stock - a.stock;
        case 'newest':
          return new Date(b.fechaCreacion) - new Date(a.fechaCreacion);
        case 'name':
        default:
          return a.nombre.localeCompare(b.nombre);
      }
    });

    setFilteredProducts(filtered);
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      loadProducts();
      return;
    }

    setLoading(true);
    try {
      const data = await productService.searchProducts(searchQuery);
      setProducts(data);
      if (data.length === 0) {
        toast.info(`No se encontraron productos para "${searchQuery}"`);
      } else {
        toast.success(`${data.length} productos encontrados`);
      }
    } catch (error) {
      toast.error('Error en la búsqueda');
    } finally {
      setLoading(false);
    }
  };

  const addToCart = async (product) => {
    if (!user) {
      toast.error('Debes iniciar sesión para agregar productos al carrito');
      return;
    }

    setAddingToCart(prev => new Set(prev).add(product.id));
    try {
      await cartService.addToCart({
        usuarioId: user.id,
        productoId: product.id,
        cantidad: 1
      });
      toast.success(`${product.nombre} agregado al carrito`);
      await refreshCart();
    } catch (error) {
      toast.error(error.response?.data?.message || 'Error al agregar producto al carrito');
    } finally {
      setAddingToCart(prev => {
        const newSet = new Set(prev);
        newSet.delete(product.id);
        return newSet;
      });
    }
  };

  const toggleFavorite = (productId) => {
    const newFavorites = new Set(favorites);
    if (newFavorites.has(productId)) {
      newFavorites.delete(productId);
      toast.success('Eliminado de favoritos');
    } else {
      newFavorites.add(productId);
      toast.success('Agregado a favoritos');
    }
    setFavorites(newFavorites);
    localStorage.setItem('favorites', JSON.stringify([...newFavorites]));
  };

  const clearSearch = () => {
    setSearchQuery('');
    loadProducts();
  };

  const clearFilters = () => {
    setSearchQuery('');
    setSortBy('name');
    setPriceRange({ min: 0, max: 10000 });
    loadProducts();
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleSearch();
    }
  };

  const stats = useMemo(() => {
    return {
      total: filteredProducts.length,
      inStock: filteredProducts.filter(p => p.stock > 0).length,
      lowStock: filteredProducts.filter(p => p.stock > 0 && p.stock <= 5).length,
      avgPrice: filteredProducts.length > 0
        ? (filteredProducts.reduce((sum, p) => sum + p.precio, 0) / filteredProducts.length).toFixed(0)
        : 0
    };
  }, [filteredProducts]);

  if (loading && products.length === 0) {
    return (
      <Container maxWidth="lg" sx={{ py: 8 }}>
        <Box sx={{ textAlign: 'center', py: 8 }}>
          <CircularProgress size={60} />
          <Typography variant="h5" sx={{ mt: 3, mb: 1, color: '#111827' }}>
            Cargando productos...
          </Typography>
          <Typography variant="body2" color="#6b7280">
            Preparando el mejor catálogo para ti
          </Typography>
        </Box>
      </Container>
    );
  }

  return (
    <Box sx={{ bgcolor: '#f9fafb', minHeight: '100vh', pb: 8 }}>
      <Container maxWidth="xl" sx={{ py: 4 }}>
        {/* Header */}
        <Box sx={{ mb: 4 }}>
          <Stack
            direction={{ xs: 'column', lg: 'row' }}
            justifyContent="space-between"
            alignItems={{ xs: 'flex-start', lg: 'center' }}
            spacing={3}
          >
            <Box>
              <Typography variant="h3" fontWeight="bold" gutterBottom color="#111827">
                Catálogo de Productos
              </Typography>
              <Typography variant="body1" color="#6b7280">
                Descubre productos increíbles o{' '}
                <Typography component="span" color="#3b82f6" fontWeight="600">
                  usa nuestro chat IA
                </Typography>{' '}
                para buscar
              </Typography>
            </Box>

            {/* Search Bar */}
            <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ width: { xs: '100%', lg: 'auto' }, minWidth: { lg: 400 } }}>
              <TextField
                fullWidth
                placeholder="Buscar productos... (ej: smartphone, auriculares)"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyPress={handleKeyPress}
                sx={{
                  bgcolor: 'white',
                  '& .MuiInputBase-input': {
                    color: '#111827',
                  },
                  '& .MuiOutlinedInput-root': {
                    '& fieldset': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover fieldset': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused fieldset': {
                      borderColor: '#3b82f6',
                    },
                  },
                  '& .MuiInputBase-input::placeholder': {
                    color: '#9ca3af',
                    opacity: 1,
                  }
                }}
                InputProps={{
                  startAdornment: (
                    <InputAdornment position="start">
                      <Search sx={{ color: '#6b7280' }} />
                    </InputAdornment>
                  ),
                  endAdornment: searchQuery && (
                    <InputAdornment position="end">
                      <IconButton size="small" onClick={clearSearch}>
                        <X sx={{ color: '#6b7280' }} />
                      </IconButton>
                    </InputAdornment>
                  ),
                }}
              />
              <Button
                variant="contained"
                onClick={handleSearch}
                sx={{ minWidth: 120 }}
              >
                Buscar
              </Button>
            </Stack>
          </Stack>
        </Box>

        {/* Stats Bar */}
        <Grid container spacing={2} sx={{ mb: 4 }}>
          <Grid item xs={6} sm={3}>
            <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'white', border: '1px solid #e5e7eb' }}>
              <Typography variant="h4" fontWeight="bold" color="#3b82f6">
                {stats.total}
              </Typography>
              <Typography variant="body2" color="#6b7280">
                Productos
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'white', border: '1px solid #e5e7eb' }}>
              <Typography variant="h4" fontWeight="bold" color="#10b981">
                {stats.inStock}
              </Typography>
              <Typography variant="body2" color="#6b7280">
                En Stock
              </Typography>
            </Paper>
          </Grid>
          <Grid item xs={6} sm={3}>
            <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'white', border: '1px solid #e5e7eb' }}>
              <Typography variant="h4" fontWeight="bold" color="#f59e0b">
                {stats.lowStock}
              </Typography>
              <Typography variant="body2" color="#6b7280">
                Stock Bajo
              </Typography>
            </Paper>
          </Grid>
          {filteredProducts.length > 0 && (
            <Grid item xs={6} sm={3}>
              <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'white' }}>
                <Typography variant="h4" fontWeight="bold" color="#E66C5D">
                  24/7
                </Typography>
                <Typography variant="body2" color="#6b7280">
                  Activo
                </Typography>
              </Paper>
            </Grid>
          )}

          {/* 
          <Grid item xs={6} sm={3}>
            <Paper elevation={1} sx={{ p: 3, textAlign: 'center', bgcolor: 'white', border: '1px solid #e5e7eb' }}>
              <Typography variant="h4" fontWeight="bold" color="#3b82f6">
                Q{stats.avgPrice}
              </Typography>
              <Typography variant="body2" color="#6b7280">
                Precio Promedio
              </Typography>
            </Paper>
          </Grid>*/}
        </Grid>

        {/* Controls */}
        <Paper elevation={1} sx={{ p: 2, mb: 4, bgcolor: 'white' }}>
          <Stack direction={{ xs: 'column', lg: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', lg: 'center' }} spacing={2}>
            <Stack direction="row" spacing={2} flexWrap="wrap" alignItems="center">
              <Button
                variant={showFilters ? "contained" : "outlined"}
                startIcon={<SlidersHorizontal />}
                onClick={() => setShowFilters(!showFilters)}
                sx={{
                  color: showFilters ? 'white' : '#374151',
                  borderColor: '#d1d5db',
                  '&:hover': {
                    borderColor: '#9ca3af',
                    bgcolor: showFilters ? undefined : '#f9fafb'
                  }
                }}
              >
                Filtros
              </Button>

              <FormControl size="small" sx={{ minWidth: 200 }}>
                <Select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value)}
                  sx={{
                    color: '#111827',
                    '& .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#d1d5db',
                    },
                    '&:hover .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#9ca3af',
                    },
                    '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                      borderColor: '#3b82f6',
                    },
                    '& .MuiSvgIcon-root': {
                      color: '#6b7280',
                    }
                  }}
                  MenuProps={{
                    PaperProps: {
                      sx: {
                        bgcolor: 'white',
                        '& .MuiMenuItem-root': {
                          color: '#111827',
                          '&:hover': {
                            bgcolor: '#f3f4f6',
                          },
                          '&.Mui-selected': {
                            bgcolor: '#eff6ff',
                            '&:hover': {
                              bgcolor: '#dbeafe',
                            }
                          }
                        }
                      }
                    }
                  }}
                >
                  <MenuItem value="name">Ordenar por nombre</MenuItem>
                  <MenuItem value="price-low">Precio: menor a mayor</MenuItem>
                  <MenuItem value="price-high">Precio: mayor a menor</MenuItem>
                  <MenuItem value="stock">Mayor stock</MenuItem>
                  <MenuItem value="newest">Más recientes</MenuItem>
                </Select>
              </FormControl>

              {(searchQuery || sortBy !== 'name') && (
                <Button
                  variant="outlined"
                  startIcon={<X />}
                  onClick={clearFilters}
                  color="error"
                  sx={{
                    color: '#ef4444',
                    borderColor: '#fecaca',
                    '&:hover': {
                      borderColor: '#ef4444',
                      bgcolor: '#fef2f2'
                    }
                  }}
                >
                  Limpiar
                </Button>
              )}
            </Stack>

            <Stack direction="row" spacing={1} alignItems="center">
              <Typography variant="body2" color="#6b7280">
                Vista:
              </Typography>
              <ToggleButtonGroup
                value={viewMode}
                exclusive
                onChange={(e, newMode) => newMode && setViewMode(newMode)}
                size="small"
                sx={{
                  '& .MuiToggleButton-root': {
                    color: '#6b7280',
                    borderColor: '#d1d5db',
                    '&.Mui-selected': {
                      color: '#3b82f6',
                      bgcolor: '#eff6ff',
                      borderColor: '#3b82f6',
                      '&:hover': {
                        bgcolor: '#dbeafe',
                      }
                    },
                    '&:hover': {
                      bgcolor: '#f9fafb',
                    }
                  }
                }}
              >
                <ToggleButton value="grid">
                  <Grid3x3 />
                </ToggleButton>
                <ToggleButton value="list">
                  <List />
                </ToggleButton>
              </ToggleButtonGroup>
            </Stack>
          </Stack>

          {/* Advanced Filters */}
          <Collapse in={showFilters}>
            <Divider sx={{ my: 2 }} />
            <Grid container spacing={2}>
              <Grid item xs={12} md={4}>
                <Typography variant="subtitle2" gutterBottom color="#374151">
                  Rango de Precio: Q{priceRange.min} - Q{priceRange.max}
                </Typography>
                <Stack direction="row" spacing={1}>
                  <TextField
                    size="small"
                    type="number"
                    label="Min"
                    value={priceRange.min}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, min: Number(e.target.value) }))}
                    fullWidth
                    InputLabelProps={{
                      style: { color: '#6b7280' }
                    }}
                    inputProps={{
                      style: { color: '#111827' }
                    }}
                    sx={{
                      '& .MuiInputLabel-root': {
                        color: '#6b7280',
                      },
                      '& .MuiOutlinedInput-root': {
                        color: '#111827',
                        bgcolor: 'white',
                        '& input': {
                          color: '#111827',
                        },
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                        },
                      },
                    }}
                  />
                  <TextField
                    size="small"
                    type="number"
                    label="Max"
                    value={priceRange.max}
                    onChange={(e) => setPriceRange(prev => ({ ...prev, max: Number(e.target.value) }))}
                    fullWidth
                    InputLabelProps={{
                      style: { color: '#6b7280' }
                    }}
                    inputProps={{
                      style: { color: '#111827' }
                    }}
                    sx={{
                      '& .MuiInputLabel-root': {
                        color: '#6b7280',
                      },
                      '& .MuiOutlinedInput-root': {
                        color: '#111827',
                        bgcolor: 'white',
                        '& input': {
                          color: '#111827',
                        },
                        '& fieldset': {
                          borderColor: '#d1d5db',
                        },
                        '&:hover fieldset': {
                          borderColor: '#9ca3af',
                        },
                        '&.Mui-focused fieldset': {
                          borderColor: '#3b82f6',
                        },
                      },
                    }}
                  />
                </Stack>
              </Grid>

              <Grid item xs={12} md={4}>
           
              </Grid>

              <Grid item xs={12} md={4}>
               
              </Grid>
            </Grid>
          </Collapse>
        </Paper>

        {/* Products Grid/List */}
        {filteredProducts.length === 0 ? (
          <Paper elevation={1} sx={{ p: 8, textAlign: 'center', bgcolor: 'white' }}>
            <Avatar sx={{ width: 80, height: 80, mx: 'auto', mb: 3, bgcolor: '#dbeafe' }}>
              <Package sx={{ fontSize: 40, color: '#3b82f6' }} />
            </Avatar>

            <Typography variant="h4" gutterBottom color="#111827">
              {searchQuery ? 'No se encontraron productos' : 'No hay productos disponibles'}
            </Typography>
            <Typography variant="body1" color="#6b7280" sx={{ mb: 4 }}>
              {searchQuery
                ? `No encontramos productos que coincidan con "${searchQuery}". Intenta con otros términos.`
                : 'Los productos aparecerán aquí cuando estén disponibles en el inventario.'
              }
            </Typography>

            <Stack spacing={3} alignItems="center">
              {searchQuery && (
                <Button variant="contained" onClick={clearSearch}>
                  Ver todos los productos
                </Button>
              )}

              <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
                <Button
                  variant="contained"
                  startIcon={<Bot />}
                  href="/chat"
                  size="large"
                >
                  Usar Chat IA
                </Button>
                {user && (
                  <Button
                    variant="outlined"
                    startIcon={<Plus />}
                    href="/admin"
                    size="large"
                  >
                    Agregar Productos
                  </Button>
                )}
              </Stack>

              <Stack direction="row" spacing={3} sx={{ mt: 2 }}>
                <Chip icon={<Sparkles />} label="Búsqueda inteligente" color="primary" />
                <Chip icon={<CheckCircle />} label="100% gratuito" color="success" />
              </Stack>
            </Stack>
          </Paper>
        ) : (
          <Grid container spacing={3}>
            {filteredProducts.map((product) => (
              viewMode === 'grid' ? (
                // Grid View
                <Grid item xs={12} sm={6} md={4} lg={3} key={product.id}>
                  <Card
                    elevation={1}
                    sx={{
                      height: '100%',
                      display: 'flex',
                      flexDirection: 'column',
                      transition: 'all 0.3s',
                      bgcolor: 'white',
                      '&:hover': {
                        transform: 'translateY(-4px)',
                        boxShadow: 3
                      }
                    }}
                  >
                    <Box sx={{ position: 'relative', paddingTop: '100%', overflow: 'hidden' }}>
                      <CardMedia
                        component="img"
                        image={
                          (product.imagenUrl)
                            ? `http://localhost:3000/qa/productos/imagen/${product.imagenUrl}`
                            : '/placeholder.png'
                        }
                        alt={product.nombre}
                        sx={{
                          position: 'absolute',
                          top: 0,
                          left: 0,
                          width: '100%',
                          height: '100%',
                          objectFit: 'contain',
                          bgcolor: '#f9fafb',
                          padding: 2,
                          cursor: 'pointer',
                          transition: 'transform 0.3s',
                          '&:hover': {
                            transform: 'scale(1.05)'
                          }
                        }}
                        onClick={() => product.imagenUrl && handleImageClick(`http://localhost:3000/qa/productos/imagen/${product.imagenUrl}`)}
                        onError={(e) => {
                          e.target.onerror = null; // Evita loop infinito
                          e.target.src = '/placeholder.png';
                        }}
                      />

                      {/* Icono de lupa al hacer hover */}
                      {product.imagenUrl && (
                        <Box
                          sx={{
                            position: 'absolute',
                            top: '50%',
                            left: '50%',
                            transform: 'translate(-50%, -50%)',
                            opacity: 0,
                            transition: 'opacity 0.3s',
                            '&:hover': {
                              opacity: 1
                            },
                            pointerEvents: 'none',
                            zIndex: 1
                          }}
                        >
                          <Avatar
                            sx={{
                              width: 56,
                              height: 56,
                              bgcolor: 'rgba(59, 130, 246, 0.9)',
                              backdropFilter: 'blur(4px)'
                            }}
                          >
                            <ZoomIn sx={{ fontSize: 32, color: 'white' }} />
                          </Avatar>
                        </Box>
                      )}

                      <Chip
                        label={product.stock > 0 ? `${product.stock} disponibles` : 'Sin stock'}
                        size="small"
                        color={product.stock > 10 ? 'success' : product.stock > 0 ? 'warning' : 'error'}
                        sx={{ position: 'absolute', top: 8, left: 8, zIndex: 2 }}
                      />

                      <IconButton
                        onClick={() => toggleFavorite(product.id)}
                        sx={{
                          position: 'absolute',
                          top: 8,
                          right: 8,
                          bgcolor: 'white',
                          zIndex: 2,
                          '&:hover': {
                            bgcolor: '#fef2f2',  // ← Fondo rojo claro al hacer hover
                            transform: 'scale(1.1)',  // ← Efecto de escala
                            transition: 'all 0.2s'
                          }
                        }}
                        size="small"
                      >
                        {favorites.has(product.id) ? (
                          <Favorite sx={{ color: '#ef4444' }} />  // ← Corazón lleno en rojo
                        ) : (
                          <FavoriteBorder sx={{ color: '#ef4444' }} />  // ← Contorno en rojo
                        )}
                      </IconButton>
                    </Box>

                    <CardContent sx={{ flexGrow: 1 }}>
                      <Typography variant="h6" gutterBottom noWrap color="#111827">
                        {product.nombre}
                      </Typography>

                      {product.descripcion && (
                        <Typography
                          variant="body2"
                          color="#6b7280"
                          sx={{
                            mb: 2,
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            display: '-webkit-box',
                            WebkitLineClamp: 2,
                            WebkitBoxOrient: 'vertical',
                          }}
                        >
                          {product.descripcion}
                        </Typography>
                      )}

                      <Stack direction="row" alignItems="center" spacing={1} sx={{ mb: 1 }}>
                        <Typography variant="h5" color="#3b82f6" fontWeight="bold">
                          Q{product.precio.toLocaleString()}
                        </Typography>
                        <Stack direction="row" spacing={0.5}>
                          {[...Array(5)].map((_, i) => (
                            <Star key={i} sx={{ fontSize: 16, color: '#f59e0b' }} />
                          ))}
                        </Stack>
                      </Stack>

                      <Typography variant="caption" color="#9ca3af">
                        Agregado: {new Date(product.fechaCreacion).toLocaleDateString()}
                      </Typography>
                    </CardContent>

                    <CardActions>
                      <Button
                        fullWidth
                        variant="contained"
                        startIcon={addingToCart.has(product.id) ? <CircularProgress size={20} /> : <ShoppingCart />}
                        onClick={() => addToCart(product)}
                        disabled={!user || product.stock === 0 || addingToCart.has(product.id)}
                      >
                        {addingToCart.has(product.id)
                          ? 'Agregando...'
                          : !user
                            ? 'Inicia sesión'
                            : product.stock === 0
                              ? 'Sin stock'
                              : 'Agregar'
                        }
                      </Button>
                    </CardActions>
                  </Card>
                </Grid>
              ) : (
                // List View
                <Grid item xs={12} key={product.id}>
                  <Card elevation={1} sx={{ bgcolor: 'white' }}>
                    <Stack direction="row" spacing={2}>
                      <Box sx={{ width: 150, flexShrink: 0 }}>
                        <CardMedia
                          component="img"
                          height="150"
                          image={
                            (product.imagenUrl)
                              ? `http://localhost:3000/qa/productos/imagen/${product.imagenUrl}`
                              : '/placeholder.png'
                          }
                          alt={product.nombre}
                          sx={{ objectFit: 'cover' }}
                          onError={(e) => {
                            console.error('Error cargando imagen. Producto completo:', product);
                            e.target.src = '/placeholder.png';
                          }}
                        />
                      </Box>

                      <Box sx={{ flexGrow: 1, p: 2 }}>
                        <Stack direction={{ xs: 'column', md: 'row' }} justifyContent="space-between" spacing={2}>
                          <Box sx={{ flexGrow: 1 }}>
                            <Typography variant="h6" gutterBottom color="#111827">
                              {product.nombre}
                            </Typography>

                            {product.descripcion && (
                              <Typography variant="body2" color="#6b7280" sx={{ mb: 2 }}>
                                {product.descripcion}
                              </Typography>
                            )}

                            <Stack direction="row" spacing={2} alignItems="center" flexWrap="wrap">
                              <Typography variant="h5" color="#3b82f6" fontWeight="bold">
                                Q{product.precio.toLocaleString()}
                              </Typography>

                              <Chip
                                label={`Stock: ${product.stock}`}
                                size="small"
                                color={product.stock > 10 ? 'success' : product.stock > 0 ? 'warning' : 'error'}
                              />

                              <Stack direction="row" spacing={0.5}>
                                {[...Array(5)].map((_, i) => (
                                  <Star key={i} sx={{ fontSize: 16, color: '#f59e0b' }} />
                                ))}
                              </Stack>
                            </Stack>
                          </Box>

                          <Stack direction={{ xs: 'row', md: 'column' }} spacing={1} justifyContent="center">
                            <IconButton 
                              onClick={() => toggleFavorite(product.id)} 
                              sx={{
                                '& .MuiSvgIcon-root': {
                                  filter: favorites.has(product.id) 
                                    ? 'drop-shadow(0 0 2px rgba(239, 68, 68, 0.5))' 
                                    : 'drop-shadow(0 0 1px rgba(0, 0, 0, 0.3))',
                                }
                              }}
                            >
                              {favorites.has(product.id) 
                                ? <Favorite sx={{ color: '#ef4444' }} /> 
                                : <FavoriteBorder sx={{ color: '#6b7280' }} />
                              }
                            </IconButton>
                                
                            <Button
                              variant="contained"
                              startIcon={addingToCart.has(product.id) ? <CircularProgress size={20} /> : <ShoppingCart />}
                              onClick={() => addToCart(product)}
                              disabled={!user || product.stock === 0 || addingToCart.has(product.id)}
                            >
                              {addingToCart.has(product.id)
                                ? 'Agregando...'
                                : !user
                                  ? 'Inicia sesión'
                                  : product.stock === 0
                                    ? 'Sin stock'
                                    : 'Agregar'
                              }
                            </Button>
                          </Stack>
                        </Stack>
                      </Box>
                    </Stack>
                  </Card>
                </Grid>
              )
            ))}
          </Grid>
        )}

        {/* AI Chat Promotion */}
        {!searchQuery && filteredProducts.length > 0 && (
          <Paper
            elevation={2}
            sx={{
              p: 4,
              mt: 6,
              background: 'linear-gradient(135deg, #3b82f6 0%, #06b6d4 100%)',
              color: 'white',
              borderRadius: 3
            }}
          >
            <Stack direction={{ xs: 'column', md: 'row' }} spacing={4} alignItems="center" justifyContent="space-between">
              <Stack direction="row" spacing={3} alignItems="center">
                <Avatar sx={{ width: 60, height: 60, bgcolor: 'white', color: 'primary.main' }}>
                  <Bot sx={{ fontSize: 40 }} />
                </Avatar>

                <Box>
                  <Typography variant="h5" fontWeight="bold" gutterBottom>
                    ¿No encuentras lo que buscas?
                  </Typography>
                  <Typography variant="body1" sx={{ mb: 2 }}>
                    Usa nuestro asistente de compras con IA. Solo dile qué necesitas.
                  </Typography>
                  <Stack direction="row" spacing={2}>
                    <Chip icon={<Sparkles />} label="Búsqueda inteligente" sx={{ bgcolor: 'white', color: 'primary.main' }} />
                    <Chip icon={<CheckCircle />} label="100% gratuito" sx={{ bgcolor: 'white', color: 'success.main' }} />
                  </Stack>
                </Box>
              </Stack>

              <Button
                variant="contained"
                size="large"
                startIcon={<Bot />}
                endIcon={<Sparkles />}
                href="/chat"
                sx={{
                  bgcolor: 'white',
                  color: 'primary.main',
                  '&:hover': { bgcolor: 'grey.100' }
                }}
              >
                Probar Chat IA
              </Button>
            </Stack>
          </Paper>
        )}



        {/* Floating Action Button for Chat IA (Mobile) */}
        <Fab
          color="primary"
          href="/chat"
          sx={{
            position: 'fixed',
            bottom: 24,
            right: 24,
            zIndex: 1000,
            display: { xs: 'flex', md: 'none' }
          }}
        >
          <Bot />
        </Fab>

        {/* Back to Top */}
        <Fade in={showScrollTop}>
          <Fab
            color="primary"
            size="medium"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            sx={{
              position: 'fixed',
              bottom: 24,
              right: 24,
              zIndex: 999,
              display: { xs: 'none', md: 'flex' }
            }}
          >
            <KeyboardArrowUp />
          </Fab>
        </Fade>
        {/* Modal para ver imagen en grande */}
        <Dialog
          open={imageModalOpen}
          onClose={handleCloseImageModal}
          maxWidth="lg"
          fullWidth
          PaperProps={{
            sx: {
              bgcolor: 'transparent',
              boxShadow: 'none',
              overflow: 'hidden'
            }
          }}
        >
          <DialogContent
            sx={{
              position: 'relative',
              p: 0,
              bgcolor: 'rgba(0, 0, 0, 0.9)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              minHeight: '80vh'
            }}
          >
            <IconButton
              onClick={handleCloseImageModal}
              sx={{
                position: 'absolute',
                top: 16,
                right: 16,
                bgcolor: 'white',
                color: '#ef4444',  // ← Color rojo del ícono
                zIndex: 1,
                '&:hover': {
                  bgcolor: '#fef2f2',  // ← Fondo rojo claro al hacer hover
                  color: '#dc2626'
                }
              }}
            >
              <CloseIcon />
            </IconButton>

            {selectedImage && (
              <Box
                component="img"
                src={selectedImage}
                alt="Vista ampliada"
                sx={{
                  maxWidth: '90%',
                  maxHeight: '90vh',
                  objectFit: 'contain'
                }}
              />
            )}
          </DialogContent>
        </Dialog>
      </Container>
    </Box>
  );
};

export default ProductsPage;