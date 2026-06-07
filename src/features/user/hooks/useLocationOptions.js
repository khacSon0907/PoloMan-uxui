import { useEffect, useMemo, useState } from "react";

import { getApiMessage } from "../../../shared/api";
import { locationApi } from "../api/locationApi";

function getLocationCode(location) {
  return String(
    location?.code ||
      location?.provinceCode ||
      location?.districtCode ||
      location?.wardCode ||
      location?.id ||
      "",
  );
}

function getLocationName(location) {
  return String(
    location?.name ||
      location?.provinceName ||
      location?.districtName ||
      location?.wardName ||
      location?.fullName ||
      location?.label ||
      "",
  );
}

export function normalizeLocationOption(location) {
  const code = getLocationCode(location);
  const name = getLocationName(location);

  return {
    ...location,
    code,
    name,
    value: code || name,
    label: name || code,
  };
}

function normalizeOptions(locations) {
  return locations.map(normalizeLocationOption).filter((option) => option.value);
}

export function findLocationOption(options, value) {
  const normalizedValue = String(value || "").trim().toLowerCase();

  if (!normalizedValue) return null;

  return (
    options.find(
      (option) =>
        option.code.toLowerCase() === normalizedValue ||
        option.name.toLowerCase() === normalizedValue ||
        option.label.toLowerCase() === normalizedValue,
    ) || null
  );
}

export function useLocationOptions(provinceCode, districtCode) {
  const [provinces, setProvinces] = useState([]);
  const [districts, setDistricts] = useState([]);
  const [wards, setWards] = useState([]);
  const [isLoadingProvinces, setIsLoadingProvinces] = useState(false);
  const [isLoadingDistricts, setIsLoadingDistricts] = useState(false);
  const [isLoadingWards, setIsLoadingWards] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsLoadingProvinces(true);
      setError("");
    });

    locationApi
      .getProvinces()
      .then((locations) => {
        if (isMounted) setProvinces(normalizeOptions(locations));
      })
      .catch((requestError) => {
        if (isMounted) setError(getApiMessage(requestError, "Khong the tai danh sach tinh/thanh pho."));
      })
      .finally(() => {
        if (isMounted) setIsLoadingProvinces(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setDistricts([]);
      setWards([]);
    });

    if (!provinceCode) {
      Promise.resolve().then(() => {
        if (isMounted) setIsLoadingDistricts(false);
      });
      return () => {
        isMounted = false;
      };
    }

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsLoadingDistricts(true);
      setError("");
    });

    locationApi
      .getDistricts(provinceCode)
      .then((locations) => {
        if (isMounted) setDistricts(normalizeOptions(locations));
      })
      .catch((requestError) => {
        if (isMounted) setError(getApiMessage(requestError, "Khong the tai danh sach quan/huyen."));
      })
      .finally(() => {
        if (isMounted) setIsLoadingDistricts(false);
      });

    return () => {
      isMounted = false;
    };
  }, [provinceCode]);

  useEffect(() => {
    let isMounted = true;

    Promise.resolve().then(() => {
      if (isMounted) setWards([]);
    });

    if (!districtCode) {
      Promise.resolve().then(() => {
        if (isMounted) setIsLoadingWards(false);
      });
      return () => {
        isMounted = false;
      };
    }

    Promise.resolve().then(() => {
      if (!isMounted) return;
      setIsLoadingWards(true);
      setError("");
    });

    locationApi
      .getWards(districtCode)
      .then((locations) => {
        if (isMounted) setWards(normalizeOptions(locations));
      })
      .catch((requestError) => {
        if (isMounted) setError(getApiMessage(requestError, "Khong the tai danh sach phuong/xa."));
      })
      .finally(() => {
        if (isMounted) setIsLoadingWards(false);
      });

    return () => {
      isMounted = false;
    };
  }, [districtCode]);

  return useMemo(
    () => ({
      provinces,
      districts,
      wards,
      isLoadingProvinces,
      isLoadingDistricts,
      isLoadingWards,
      error,
    }),
    [districts, error, isLoadingDistricts, isLoadingProvinces, isLoadingWards, provinces, wards],
  );
}
